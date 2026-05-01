import { render, screen } from '@testing-library/react';
import App from './App';

test('renders landing prompt', () => {
  render(<App />);
  expect(screen.getByText(/toca la pantalla para entrar/i)).toBeInTheDocument();
});
