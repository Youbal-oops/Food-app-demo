import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { KITCHEN, destinations } from './journey';
vi.mock('./FoodSculpture', () => ({ default: ({ id }: {id: string}) => <div data-testid={'model-'+id}>3D dish model</div> }));
vi.mock('./KitchenTheater', () => ({ default: ({ phase }: {phase: number}) => <div data-testid="kitchen-scene">Kitchen scene {phase}</div> }));
vi.mock('./DriverScene', () => ({ default: () => <div data-testid="driver-scene">Driver scene</div> }));

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ code: 'Ok', routes: [{ geometry: { coordinates: [KITCHEN, destinations[0].point] }, distance: 2100, duration: 380 }] }) } as Response);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
const openBag = () => fireEvent.click(screen.getByRole('button', { name: /^Open bag,/ }));
const addButterChicken = () => fireEvent.click(screen.getByRole('button', { name: 'Add Butter Chicken to bag' }));

describe('customer experience', () => {
  it('opens the poster dish inspector and toggles ingredient layers', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Butter Chicken in 3D' }));
    const dialog = screen.getByRole('dialog', { name: 'Butter Chicken' });
    expect(within(dialog).getByText('The slow simmer')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Explore the layers' }));
    expect(within(dialog).getByRole('button', { name: 'Bring it together' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });
  it('opens directly to the storefront with three signature dishes and blocks unavailable dishes', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Good food/ })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Add Mutton Rogan Josh to bag' })).not.toBeInTheDocument();
  });

  it('combines text search and dietary filtering without losing the input', () => {
    render(<App />);
    const search = screen.getByRole('textbox', { name: 'Search dishes' });
    fireEvent.change(search, { target: { value: 'chicken' } });
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(search).toHaveValue('chicken');
    fireEvent.click(screen.getByRole('button', { name: /Veg only/ }));
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByText('A different craving, perhaps?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Explore the menu/ }));
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('saves favourites and restores the collection after a remount', () => {
    const app = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Butter Chicken' }));
    fireEvent.click(screen.getByRole('button', { name: 'Favorites' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    app.unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: 'Unsave Butter Chicken' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows an empty bag and opens/closes a dish detail dialog', () => {
    render(<App />);
    openBag();
    expect(screen.getByRole('dialog', { name: 'Your bag' })).toBeInTheDocument();
    expect(screen.getByText('A little empty. A lot of potential.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    fireEvent.click(screen.getByRole('button', { name: 'View Butter Chicken' }));
    const dialog = screen.getByRole('dialog', { name: 'Butter Chicken' });
    expect(within(dialog).getByText('Fenugreek leaves')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /Add to my bag/ }));
    expect(within(dialog).getByRole('button', { name: /Add another \(1 in bag\)/ })).toBeInTheDocument();
    fireEvent(dialog, new Event('cancel', { bubbles: false }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('applies a valid discount, checks out with a chosen destination, and advances the order film', async () => {
    vi.useFakeTimers();
    render(<App />);
    addButterChicken();
    openBag();
    fireEvent.change(screen.getByRole('textbox', { name: 'Promo code' }), { target: { value: 'WRONG' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Try HELLO20');
    fireEvent.change(screen.getByRole('textbox', { name: 'Promo code' }), { target: { value: 'hello20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    fireEvent.click(screen.getByRole('button', { name: /Let’s make it happen/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sector 9' })); });
    fireEvent.submit(screen.getByRole('button', { name: /Place demo order/ }).closest('form')!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Order confirmed.' })).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem('delivr.studio.v1')!);
    expect(saved.cart).toEqual({});
    expect(saved.orders[0].journey.destination.label).toBe('Sector 9, Chandigarh');
    expect(saved.orders[0]).toMatchObject({ subtotal: 220, discount: 44, delivery: 30, total: 206, status: 'placed' });
    act(() => vi.advanceTimersByTime(12000));
    expect(screen.getByRole('heading', { name: 'A little kitchen magic.' })).toBeInTheDocument();
    // The customer can pause the explicit simulation, keeping the real state stable.
    fireEvent.click(screen.getByRole('button', { name: /Pause animation/ }));
    expect(screen.getByRole('button', { name: /Play delivery demo/ })).toBeInTheDocument();
  });

  it('requires an explicit pin and permits an honest fallback when routing is offline', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    render(<App />);
    addButterChicken(); openBag();
    fireEvent.click(screen.getByRole('button', { name: /make it happen/ }));
    fireEvent.submit(screen.getByRole('button', { name: /Place demo order/ }).closest('form')!);
    expect(screen.getByRole('dialog', { name: 'Checkout' })).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sector 35' })); });
    fireEvent.click(screen.getByRole('button', { name: 'Use illustrated journey' }));
    fireEvent.submit(screen.getByRole('button', { name: /Place demo order/ }).closest('form')!);
    const saved = JSON.parse(localStorage.getItem('delivr.studio.v1')!);
    expect(saved.orders[0].journey.source).toBe('illustrated');
    expect(saved.orders[0].journey.destination.label).toBe('Sector 35, Chandigarh');
  });

  it('rejects an address made only of whitespace without discarding the bag', () => {
    render(<App />);
    addButterChicken();
    openBag();
    fireEvent.click(screen.getByRole('button', { name: /Let’s make it happen/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'DELIVERY ADDRESS' }), { target: { value: '            ' } });
    fireEvent.submit(screen.getByRole('button', { name: /Place demo order/ }).closest('form')!);
    expect(screen.getByRole('dialog', { name: 'Checkout' })).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem('delivr.studio.v1')!);
    expect(saved.orders).toHaveLength(0);
    expect(saved.cart.m1).toBe(1);
  });

  it('persists address edits and uses them in checkout', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Your account' }));
    fireEvent.click(screen.getByRole('button', { name: /Make yourself at home/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'YOUR NAME' }), { target: { value: 'Mochi' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'DELIVERY ADDRESS' }), { target: { value: '22 Garden Road, Delhi' } });
    fireEvent.submit(screen.getByRole('button', { name: /Save my details/ }).closest('form')!);
    expect(screen.getByRole('heading', { name: 'Hey, Mochi.' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('delivr.studio.v1')!).address).toBe('22 Garden Road, Delhi');
  });

  it('connects kitchen availability changes to customer ordering', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Owner/ }));
    const email = await screen.findByLabelText(/email/i);
    fireEvent.change(email, { target: { value: 'owner@delivr.demo' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'atelier' } });
    fireEvent.submit(email.closest('form')!);
    const toggle = await screen.findByRole('switch', { name: 'Butter Chicken available' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(JSON.parse(localStorage.getItem('delivr.studio.v1')!).unavailable).toContain('m1');
  });
});
