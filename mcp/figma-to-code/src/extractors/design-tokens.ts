/**
 * Extrait les design tokens depuis un document Figma
 */
export function extractDesignTokens(document: any) {
  const tokens: {
    colors: Record<string, string>;
    typography: Record<string, any>;
    spacing: Record<string, any>;
    borderRadius: Record<string, number>;
    shadows: Record<string, any>;
  } = {
    colors: {},
    typography: {},
    spacing: {},
    borderRadius: {},
    shadows: {},
  };

  // Traverse the document to find styles
  traverseNode(document, (node: any) => {
    // Extract colors from fills
    if (node.fills && Array.isArray(node.fills)) {
      node.fills.forEach((fill: any) => {
        if (fill.type === 'SOLID' && fill.color) {
          const colorName = node.name || 'unnamed';
          tokens.colors[colorName] = rgbaToHex(fill.color);
        }
      });
    }

    // Extract typography
    if (node.style && node.style.fontFamily) {
      const typographyName = node.name || 'unnamed';
      tokens.typography[typographyName] = {
        fontFamily: node.style.fontFamily,
        fontSize: node.style.fontSize,
        fontWeight: node.style.fontWeight,
        lineHeight: node.style.lineHeight,
        letterSpacing: node.style.letterSpacing,
      };
    }

    // Extract spacing from auto-layout
    if (node.paddingLeft || node.paddingTop) {
      tokens.spacing = {
        ...tokens.spacing,
        paddingLeft: node.paddingLeft,
        paddingTop: node.paddingTop,
        paddingRight: node.paddingRight,
        paddingBottom: node.paddingBottom,
        itemSpacing: node.itemSpacing,
      };
    }

    // Extract border radius
    if (node.cornerRadius !== undefined) {
      const radiusName = node.name || 'default';
      tokens.borderRadius[radiusName] = node.cornerRadius;
    }

    // Extract shadows
    if (node.effects && Array.isArray(node.effects)) {
      node.effects.forEach((effect: any) => {
        if (effect.type === 'DROP_SHADOW') {
          const shadowName = node.name || 'default';
          tokens.shadows[shadowName] = {
            offsetX: effect.offset.x,
            offsetY: effect.offset.y,
            blur: effect.radius,
            color: rgbaToHex(effect.color),
          };
        }
      });
    }
  });

  return tokens;
}

function traverseNode(node: any, callback: (node: any) => void) {
  callback(node);

  if (node.children) {
    node.children.forEach((child: any) => {
      traverseNode(child, callback);
    });
  }
}

function rgbaToHex(color: { r: number; g: number; b: number; a?: number }): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  let hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  if (color.a !== undefined && color.a < 1) {
    const a = Math.round(color.a * 255);
    hex += toHex(a);
  }

  return hex.toUpperCase();
}
