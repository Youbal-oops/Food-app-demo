import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import OrderJourney from './OrderJourney';
import KitchenTheater from './KitchenTheater';
import { destinations, illustratedPlan } from './journey';
import { type FoodOrder, type Status } from './domain';

vi.mock('./DriverScene', () => ({ default: ({ destination }: { destination: string }) => <div>Driving to {destination}</div> }));
const order: FoodOrder = { id: 'film', status: 'placed', createdAt: 1000, address: 'Sector 9 Chandigarh', items: [{ id: 'm1', name: 'Butter Chicken', qty: 2, price: 220, image: '' }], total: 470, subtotal: 440, delivery: 30, discount: 0, journey: illustratedPlan(destinations[0]) };
beforeEach(() => {
  // jsdom intentionally exercises the WebGL-unavailable path.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const report = console.error;
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (String(args[0]).includes('Error creating WebGL context')) return;
    report(...args);
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('order film', () => {
  it('plays every chapter, preserves pause position, and replays without reverting a delivered order', async () => {
    vi.useFakeTimers();
    const transitions: Status[] = [];
    function Harness() {
      const [current, setCurrent] = useState(order), [playing, setPlaying] = useState(true);
      return <OrderJourney order={current} playing={playing} onPlaying={setPlaying} onStatus={status => { transitions.push(status); setCurrent(o => ({ ...o, status })); }} />;
    }
    await act(async () => { render(<Harness />); });
    expect(screen.getByLabelText('Order scene: Received')).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(13000));
    expect(screen.getByLabelText('Order scene: The flame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pause animation' }));
    act(() => vi.advanceTimersByTime(25000));
    expect(screen.getByLabelText('Order scene: The flame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play delivery demo' }));
    await act(async () => vi.advanceTimersByTime(24000));
    expect(screen.getByText('Driving to Sector 9, Chandigarh')).toBeInTheDocument();
    expect(transitions).toEqual(['preparing', 'out_for_delivery']);
    fireEvent.click(screen.getByRole('button', { name: 'City map' }));
    expect(screen.getByRole('img', { name: 'Chandigarh delivery route map' })).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(40000));
    expect(screen.getByLabelText('Order scene: At home')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Film complete' })).toBeDisabled();
    expect(transitions).toEqual(['preparing', 'out_for_delivery', 'delivered']);
    fireEvent.click(screen.getByRole('button', { name: 'Replay the whole experience' }));
    await act(async () => vi.advanceTimersByTime(14000));
    expect(screen.getByLabelText('Order scene: The flame')).toBeInTheDocument();
    expect(transitions).toEqual(['preparing', 'out_for_delivery', 'delivered']);
  });
  it('keeps kitchen controls and order context usable when WebGL is unavailable', () => {
    const ui = render(<KitchenTheater phase={2} progress={.5} dishes={['2 ? Butter Chicken']} paused={false} />);
    expect(screen.getByText('3D kitchen unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Toss the pan/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Turn up heat/ }));
    expect(screen.getByRole('button', { name: /High heat/ })).toHaveAttribute('aria-pressed', 'true');
    ui.rerender(<KitchenTheater phase={5} progress={1} dishes={['2 ? Butter Chicken']} paused />);
    fireEvent.click(screen.getByRole('button', { name: /Dinner is served/ }));
    expect(screen.getByRole('button', { name: /Cover the table/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
