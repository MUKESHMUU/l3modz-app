import { render, screen } from '@testing-library/react';
import Home from './Home';

describe('Home page', () => {
  it('renders hero and featured products sections', () => {
    render(<Home />);
    expect(screen.getByText(/Upgrade Your Ride with/i)).toBeInTheDocument();
    expect(screen.getByText(/Shop by Category/i)).toBeInTheDocument();
    expect(screen.getByText(/Featured Products/i)).toBeInTheDocument();
  });
});
