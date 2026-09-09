import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import RunOnShoesDemo from './run_on_shoes.tsx';
import '../../app/globals.css';

export function mountGame() {
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing game root element');
  createRoot(root).render(
    <StrictMode>
      <RunOnShoesDemo />
    </StrictMode>,
  );
}
