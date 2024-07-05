import fetch from 'node-fetch';
import { writeFileSync } from 'fs';

const FIGMA_API_URL = 'https://api.figma.com/v1';
const FIGMA_FILE_KEY = 'kHURltuksu0EljOnPnXDIg';
const FIGMA_ACCESS_TOKEN = 'figd_5v7-n-MfLdBOCIjrd24Fzj9_cD7nMQY6gauFd40M';

const fetchFigmaData = async () => {
  try {
    const response = await fetch(`${FIGMA_API_URL}/files/${FIGMA_FILE_KEY}`, {
      headers: {
        'X-Figma-Token': FIGMA_ACCESS_TOKEN
      }
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    const structuredData = processFigmaData(data);
    console.log('Structured Data:', JSON.stringify(structuredData, null, 2));
    writeFileSync('structuredData.json', JSON.stringify(structuredData, null, 2));
  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error);
  }
};

const getStyle = (styles, styleId) => {
  return styles[styleId] ? styles[styleId].name : 'Unknown Style';
};

const extractCSSProperties = (node) => {
  const cssProperties = {};

  if (node.absoluteBoundingBox) {
    cssProperties.width = `${node.absoluteBoundingBox.width}px`;
    cssProperties.height = `${node.absoluteBoundingBox.height}px`;
    cssProperties.left = `${node.absoluteBoundingBox.x}px`;
    cssProperties.top = `${node.absoluteBoundingBox.y}px`;
  }

  if (node.fills && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
    const { r, g, b, a } = node.fills[0].color;
    cssProperties.backgroundColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  }

  if (node.strokes && node.strokes.length > 0) {
    const { r, g, b, a } = node.strokes[0].color;
    cssProperties.border = `${node.strokeWeight}px solid rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  }

  if (node.cornerRadius) {
    cssProperties.borderRadius = `${node.cornerRadius}px`;
  }

  if (node.effects && node.effects.length > 0) {
    node.effects.forEach(effect => {
      const { r, g, b, a } = effect.color;
      const color = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
      if (effect.type === 'DROP_SHADOW') {
        cssProperties.boxShadow = `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${color}`;
      } else if (effect.type === 'INNER_SHADOW') {
        cssProperties.boxShadow = `inset ${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${color}`;
      }
    });
  }

  if (node.opacity !== undefined && node.opacity !== 1) {
    cssProperties.opacity = node.opacity;
  }

  return cssProperties;
};

const processChildren = (children, styles) => {
  return children.map(child => {
    let styleName = 'Unknown Style';
    let cssProperties = {};

    if (child.fills && child.fills.length > 0 && child.fills[0].styleId) {
      styleName = getStyle(styles, child.fills[0].styleId);
    } else if (child.style) {
      styleName = getStyle(styles, child.style);
    }

    cssProperties = extractCSSProperties(child);

    const processedChild = {
      id: child.id,
      name: child.name,
      type: child.type,
      style: styleName,
      cssProperties,
      children: []
    };

    if (child.children) {
      // Recursively process child nodes
      processedChild.children = processChildren(child.children, styles);
    }

    return processedChild;
  });
};

const processFigmaData = (data) => {
  const documentTree = processChildren(data.document.children, data.styles);
  return {
    name: data.name,
    lastModified: data.lastModified,
    thumbnailUrl: data.thumbnailUrl,
    documentTree
  };
};

fetchFigmaData();
