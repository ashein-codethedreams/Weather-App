import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the current weather app', () => {
  render(<App />);
  expect(
    screen.getByRole('heading', { name: /look outside, from anywhere/i })
  ).toBeInTheDocument();
});
