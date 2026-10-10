import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the weather app title', () => {
  render(<App />);
  expect(screen.getByText(/weather pulse/i)).toBeInTheDocument();
});
