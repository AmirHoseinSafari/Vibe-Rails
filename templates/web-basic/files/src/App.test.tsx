import { render, screen } from '@testing-library/react';
import App from './App';

// Tests for scope items carry the item's id in their name, for example:
//   test('[S1] a new task shows up in the list', ...)
test('the app opens', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
});
