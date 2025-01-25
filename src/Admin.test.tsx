import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Admin, { type KitchenOrder } from './Admin';

const now = new Date(2026, 9, 13, 14).getTime();
const orders: KitchenOrder[] = [
  { id: 'today1', createdAt: now - 60_000, status: 'placed', total: 450, address: 'Sector 9', items: [{ name: 'Butter Chicken', qty: 2 }] },
  { id: 'today2', createdAt: now - 120_000, status: 'delivered', total: 300, address: 'Sector 17', items: [{ name: 'Paneer Tikka', qty: 1 }] },
  { id: 'older1', createdAt: now - 3 * 86400_000, status: 'preparing', total: 600, address: 'Sector 22', items: [{ name: 'Chicken Biryani', qty: 2 }] },
];
const items = [
  { id: 'm1', name: 'Butter Chicken', category: 'Mains', price: 220, available: true, image: '/food/m1.svg' },
  { id: 'm2', name: 'Paneer Tikka', category: 'Mains', price: 200, available: false, image: '/food/m2.svg' },
];
const onStatus = vi.fn(), onAvailability = vi.fn(), onExit = vi.fn();
function mount() { return render(<Admin orders={orders} items={items} onStatus={onStatus} onAvailability={onAvailability} onExit={onExit} />); }
function login() {
  fireEvent.click(screen.getByRole('button', { name: 'Fill demo credentials' }));
  fireEvent.click(screen.getByRole('button', { name: 'Enter command center' }));
}
function metric(label: string) { return screen.getByText(label).closest('article')!; }

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(now);
  Element.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe('owner command center', () => {
  it('rejects incorrect demo credentials and clears the session on sign-out', () => {
    mount();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'owner@delivr.demo' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enter command center' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use the demo email and password');
    login();
    expect(screen.getByRole('heading', { name: 'Command center.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Sign out$/ }));
    expect(screen.getByLabelText(/^Password/)).toHaveValue('');
    expect(screen.queryByRole('heading', { name: 'Command center.' })).not.toBeInTheDocument();
  });

  it('derives reporting metrics from the selected period while keeping the active queue global', () => {
    mount(); login();
    expect(metric('Order revenue')).toHaveTextContent('750');
    expect(metric('Total orders')).toHaveTextContent('2');
    expect(metric('Average order')).toHaveTextContent('375');
    expect(metric('Active now')).toHaveTextContent('2');
    fireEvent.change(screen.getByLabelText('Reporting period'), { target: { value: 'week' } });
    expect(metric('Order revenue')).toHaveTextContent('1,350');
    expect(metric('Average order')).toHaveTextContent('450');
    expect(metric('Total orders')).toHaveTextContent('3');
  });

  it('filters orders and sends the next real status through the integration callback', () => {
    mount(); login();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search orders' }), { target: { value: 'Sector 9' } });
    const queue = screen.getByRole('region', { name: /Order queue/ });
    expect(within(queue).getByText('#TODAY1')).toBeInTheDocument();
    expect(within(queue).queryByText('#OLDER1')).not.toBeInTheDocument();
    fireEvent.click(within(queue).getByRole('button', { name: 'Start preparing for order TODAY1' }));
    expect(onStatus).toHaveBeenCalledWith('today1', 'preparing');
    fireEvent.click(screen.getByRole('switch', { name: 'Paneer Tikka available' }));
    expect(onAvailability).toHaveBeenCalledWith('m2');
  });

  it('opens command search with Ctrl+K and applies a menu filter from the keyboard', () => {
    mount(); login();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const dialog = screen.getByRole('dialog', { name: 'Command search' });
    const search = within(dialog).getByRole('textbox', { name: 'Search commands, orders and dishes' });
    expect(search).toHaveFocus();
    fireEvent.change(search, { target: { value: 'unavailable' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(screen.queryByRole('dialog', { name: 'Command search' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Availability filter')).toHaveValue('unavailable');
    expect(screen.queryByRole('switch', { name: 'Butter Chicken available' })).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Paneer Tikka available' })).toHaveAttribute('aria-checked', 'false');
  });
});
