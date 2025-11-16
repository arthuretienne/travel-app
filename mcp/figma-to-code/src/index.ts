import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as Figma from 'figma-api';
import { extractDesignTokens } from './extractors/design-tokens.js';
import { generateReactComponent } from './generators/react-component.js';
import { generateReactNativeComponent } from './generators/react-native-component.js';

const FIGMA_TOKEN = process.env.FIGMA_ACCESS_TOKEN;

if (!FIGMA_TOKEN) {
  throw new Error('FIGMA_ACCESS_TOKEN environment variable is required');
}

const figmaClient = new Figma.Api({ personalAccessToken: FIGMA_TOKEN });

class FigmaToCodeServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'figma-to-code',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'extract_figma_design',
          description:
            'Extrait un design Figma et génère des composants React ou React Native avec les tokens de design',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'URL du fichier Figma (ex: https://www.figma.com/file/...)',
              },
              nodeId: {
                type: 'string',
                description: 'ID du node Figma à extraire (optionnel, extrait tout si non fourni)',
              },
              target: {
                type: 'string',
                enum: ['react', 'react-native'],
                description: 'Plateforme cible pour la génération de code',
              },
              componentName: {
                type: 'string',
                description: 'Nom du composant à générer (ex: OnboardingStep1)',
              },
            },
            required: ['figmaUrl', 'target', 'componentName'],
          },
        },
        {
          name: 'extract_design_tokens',
          description:
            'Extrait uniquement les design tokens (couleurs, typographie, espacements) depuis Figma',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'URL du fichier Figma',
              },
            },
            required: ['figmaUrl'],
          },
        },
        {
          name: 'generate_component_from_screenshot',
          description:
            "Génère un composant React/RN à partir d'une capture d'écran Figma",
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'URL du fichier Figma',
              },
              nodeId: {
                type: 'string',
                description: 'ID du node à capturer',
              },
              target: {
                type: 'string',
                enum: ['react', 'react-native'],
              },
              componentName: {
                type: 'string',
              },
            },
            required: ['figmaUrl', 'nodeId', 'target', 'componentName'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === 'extract_figma_design') {
          return await this.handleExtractFigmaDesign(args);
        } else if (name === 'extract_design_tokens') {
          return await this.handleExtractDesignTokens(args);
        } else if (name === 'generate_component_from_screenshot') {
          return await this.handleGenerateFromScreenshot(args);
        }

        throw new Error(`Unknown tool: ${name}`);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleExtractFigmaDesign(args: any) {
    const { figmaUrl, nodeId, target, componentName } = args;

    // Parse Figma URL
    const fileKey = this.parseFigmaUrl(figmaUrl);

    // Fetch Figma file
    const file = await figmaClient.getFile(fileKey);

    // Extract design tokens
    const designTokens = extractDesignTokens(file.document);

    // Find specific node or use root
    const targetNode = nodeId
      ? this.findNode(file.document, nodeId)
      : file.document.children[0];

    if (!targetNode) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }

    // Generate component code
    const componentCode =
      target === 'react'
        ? await generateReactComponent(targetNode, componentName, designTokens)
        : await generateReactNativeComponent(targetNode, componentName, designTokens);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              componentName,
              target,
              designTokens,
              code: componentCode,
              instructions: `
Composant généré avec succès !

1. Créez le fichier: src/components/${componentName}.${target === 'react' ? 'tsx' : 'tsx'}
2. Copiez le code ci-dessus
3. Importez les design tokens depuis votre theme
4. Ajustez les styles si nécessaire

Design tokens extraits:
- ${Object.keys(designTokens.colors || {}).length} couleurs
- ${Object.keys(designTokens.typography || {}).length} styles de texte
- ${Object.keys(designTokens.spacing || {}).length} espacements
              `.trim(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleExtractDesignTokens(args: any) {
    const { figmaUrl } = args;
    const fileKey = this.parseFigmaUrl(figmaUrl);
    const file = await figmaClient.getFile(fileKey);
    const tokens = extractDesignTokens(file.document);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              tokens,
              usage: `
// Créez un fichier src/theme/tokens.ts avec ce contenu:

export const tokens = ${JSON.stringify(tokens, null, 2)};

// Puis utilisez-le dans vos composants:
import { tokens } from './theme/tokens';

const styles = {
  color: tokens.colors.primary[500],
  fontSize: tokens.typography.fontSize.lg,
  padding: tokens.spacing.md,
};
              `.trim(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleGenerateFromScreenshot(args: any) {
    const { figmaUrl, nodeId, target, componentName } = args;
    const fileKey = this.parseFigmaUrl(figmaUrl);

    // Get image URL from Figma
    const images = await figmaClient.getImage(fileKey, {
      ids: nodeId,
      scale: 2,
      format: 'png',
    });

    const imageUrl = images.images[nodeId];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              imageUrl,
              message: `
Screenshot généré !

URL de l'image: ${imageUrl}

Utilisez cette image comme référence pour créer votre composant ${componentName}.
Vous pouvez aussi utiliser l'outil 'extract_figma_design' pour une génération automatique.
              `.trim(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private parseFigmaUrl(url: string): string {
    // Extract file key from Figma URL
    // Example: https://www.figma.com/file/ABC123/Design-File
    const match = url.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
    if (!match) {
      throw new Error('Invalid Figma URL');
    }
    return match[1];
  }

  private findNode(node: any, nodeId: string): any {
    if (node.id === nodeId) {
      return node;
    }

    if (node.children) {
      for (const child of node.children) {
        const found = this.findNode(child, nodeId);
        if (found) return found;
      }
    }

    return null;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Figma-to-Code MCP server running on stdio');
  }
}

const server = new FigmaToCodeServer();
server.run().catch(console.error);
