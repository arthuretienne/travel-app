import prettier from 'prettier';

/**
 * Génère un composant React depuis un node Figma
 */
export async function generateReactComponent(
  node: any,
  componentName: string,
  designTokens: any
): Promise<string> {
  const imports = `
import React from 'react';
import { tokens } from '../theme/tokens';
`;

  const styles = generateStyles(node, designTokens, 'css');

  const jsx = generateJSX(node);

  const component = `
${imports}

interface ${componentName}Props {
  // Add your props here
}

export const ${componentName}: React.FC<${componentName}Props> = (props) => {
  return (
    ${jsx}
  );
};

const styles = {
  ${styles}
};
`;

  return await prettier.format(component, {
    parser: 'typescript',
    singleQuote: true,
    semi: true,
    trailingComma: 'es5',
  });
}

function generateStyles(node: any, tokens: any, type: 'css' | 'rn'): string {
  const styles: Record<string, any> = {};

  const containerStyle: any = {};

  // Layout
  if (node.absoluteBoundingBox) {
    containerStyle.width = node.absoluteBoundingBox.width;
    containerStyle.height = node.absoluteBoundingBox.height;
  }

  // Background
  if (node.fills && node.fills[0]) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID') {
      containerStyle.backgroundColor = rgbaToString(fill.color);
    }
  }

  // Border radius
  if (node.cornerRadius) {
    containerStyle.borderRadius = node.cornerRadius;
  }

  // Padding (from auto-layout)
  if (node.paddingLeft) {
    containerStyle.paddingLeft = node.paddingLeft;
    containerStyle.paddingTop = node.paddingTop;
    containerStyle.paddingRight = node.paddingRight;
    containerStyle.paddingBottom = node.paddingBottom;
  }

  // Flexbox
  if (node.layoutMode) {
    containerStyle.display = 'flex';
    containerStyle.flexDirection =
      node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
    containerStyle.gap = node.itemSpacing || 0;

    // Alignment
    if (node.primaryAxisAlignItems) {
      containerStyle.justifyContent = mapAlignment(node.primaryAxisAlignItems);
    }
    if (node.counterAxisAlignItems) {
      containerStyle.alignItems = mapAlignment(node.counterAxisAlignItems);
    }
  }

  styles.container = containerStyle;

  // Text styles
  if (node.type === 'TEXT' && node.style) {
    const textStyle: any = {
      fontFamily: node.style.fontFamily,
      fontSize: node.style.fontSize,
      fontWeight: node.style.fontWeight,
      lineHeight: node.style.lineHeightPx
        ? `${node.style.lineHeightPx}px`
        : 'normal',
    };

    if (node.fills && node.fills[0]) {
      textStyle.color = rgbaToString(node.fills[0].color);
    }

    styles.text = textStyle;
  }

  return Object.entries(styles)
    .map(([key, value]) => {
      const cssProperties = Object.entries(value)
        .map(([prop, val]) => `${camelToKebab(prop)}: ${formatValue(val)}`)
        .join(',\n    ');
      return `${key}: {\n    ${cssProperties}\n  }`;
    })
    .join(',\n  ');
}

function generateJSX(node: any, depth = 0): string {
  const indent = '  '.repeat(depth);

  if (node.type === 'TEXT') {
    return `${indent}<div style={styles.text}>${node.characters || 'Text'}</div>`;
  }

  const children = node.children || [];
  const childrenJSX = children
    .map((child: any) => generateJSX(child, depth + 1))
    .join('\n');

  if (childrenJSX) {
    return `${indent}<div style={styles.container}>\n${childrenJSX}\n${indent}</div>`;
  }

  return `${indent}<div style={styles.container} />`;
}

function mapAlignment(alignment: string): string {
  const map: Record<string, string> = {
    MIN: 'flex-start',
    CENTER: 'center',
    MAX: 'flex-end',
    SPACE_BETWEEN: 'space-between',
  };
  return map[alignment] || 'flex-start';
}

function rgbaToString(color: { r: number; g: number; b: number; a?: number }): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a !== undefined ? color.a : 1;

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function formatValue(value: any): string {
  if (typeof value === 'number') {
    return `${value}px`;
  }
  if (typeof value === 'string') {
    if (
      value.startsWith('#') ||
      value.startsWith('rgb') ||
      value.startsWith('var(')
    ) {
      return value;
    }
    return `'${value}'`;
  }
  return String(value);
}
