import prettier from 'prettier';

/**
 * Génère un composant React Native depuis un node Figma
 */
export async function generateReactNativeComponent(
  node: any,
  componentName: string,
  designTokens: any
): Promise<string> {
  const imports = `
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '../theme/tokens';
`;

  const jsx = generateRNJSX(node);
  const styles = generateRNStyles(node);

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

const styles = StyleSheet.create({
  ${styles}
});
`;

  return await prettier.format(component, {
    parser: 'typescript',
    singleQuote: true,
    semi: true,
    trailingComma: 'es5',
  });
}

function generateRNJSX(node: any, depth = 0): string {
  const indent = '  '.repeat(depth);

  if (node.type === 'TEXT') {
    return `${indent}<Text style={styles.text}>${node.characters || 'Text'}</Text>`;
  }

  const children = node.children || [];
  const childrenJSX = children
    .map((child: any) => generateRNJSX(child, depth + 1))
    .join('\n');

  if (childrenJSX) {
    return `${indent}<View style={styles.container}>\n${childrenJSX}\n${indent}</View>`;
  }

  return `${indent}<View style={styles.container} />`;
}

function generateRNStyles(node: any): string {
  const styles: Record<string, any> = {};

  const containerStyle: any = {};

  // Dimensions
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

  // Padding
  if (node.paddingLeft) {
    containerStyle.paddingLeft = node.paddingLeft;
    containerStyle.paddingTop = node.paddingTop;
    containerStyle.paddingRight = node.paddingRight;
    containerStyle.paddingBottom = node.paddingBottom;
  }

  // Flexbox (React Native uses flex by default)
  if (node.layoutMode) {
    containerStyle.flexDirection =
      node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';

    if (node.itemSpacing) {
      // Note: gap n'existe pas en RN natif, utiliser marginBottom/marginRight
      containerStyle.gap = node.itemSpacing;
    }

    if (node.primaryAxisAlignItems) {
      containerStyle.justifyContent = mapRNAlignment(node.primaryAxisAlignItems);
    }
    if (node.counterAxisAlignItems) {
      containerStyle.alignItems = mapRNAlignment(node.counterAxisAlignItems);
    }
  }

  styles.container = containerStyle;

  // Text styles
  if (node.type === 'TEXT' && node.style) {
    const textStyle: any = {
      fontFamily: node.style.fontFamily,
      fontSize: node.style.fontSize,
      fontWeight: String(node.style.fontWeight),
      lineHeight: node.style.lineHeightPx,
    };

    if (node.fills && node.fills[0]) {
      textStyle.color = rgbaToString(node.fills[0].color);
    }

    styles.text = textStyle;
  }

  return Object.entries(styles)
    .map(([key, value]) => {
      const styleProps = JSON.stringify(value, null, 2).replace(/"/g, '');
      return `${key}: ${styleProps}`;
    })
    .join(',\n  ');
}

function mapRNAlignment(alignment: string): string {
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

  // React Native prefers hex colors
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
