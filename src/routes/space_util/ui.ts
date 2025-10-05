import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export function makeLabelRenderer(container) {
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  labelRenderer.domElement.style.zIndex = '1';
  container.appendChild(labelRenderer.domElement); // 👈 se monta dentro del mismo contenedor del canvas
  return labelRenderer;
}

export function makeLabel(text) {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.padding = '2px 6px';
  div.style.background = 'rgba(20,24,48,.65)';
  div.style.border = '1px solid rgba(120,140,255,.35)';
  div.style.borderRadius = '8px';
  div.style.fontSize = '11px';
  div.style.color = '#e6ecff';
  div.style.whiteSpace = 'nowrap';
  div.style.userSelect = 'none';
  div.style.transform = 'translate(-50%, -100%)'; // 👈 coloca el texto justo encima del planeta
  return new CSS2DObject(div);
}
