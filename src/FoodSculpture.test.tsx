import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import FoodSculpture from './FoodSculpture';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const report = console.error;
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (String(args[0]).includes('Error creating WebGL context')) return;
    report(...args);
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('keeps a named local illustration when WebGL cannot start and updates the selected dish', () => {
  const view = render(<FoodSculpture id="m1" />);
  expect(screen.getByRole('region', { name: 'Butter Chicken dish illustration' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('3D is unavailable');
  expect(screen.queryByRole('button', { name: /Reset/ })).not.toBeInTheDocument();
  expect(view.container.querySelector('svg')).not.toBeNull();
  view.rerender(<FoodSculpture id="m2" exploded paused />);
  expect(screen.getByRole('region', { name: 'Paneer Tikka dish illustration' })).toBeInTheDocument();
  expect(view.container.querySelector('canvas')).toBeNull();
});
