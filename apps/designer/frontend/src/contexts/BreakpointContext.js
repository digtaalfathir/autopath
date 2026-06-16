import { createContext } from 'react';

export const BreakpointContext = createContext({
  breakpoints:         new Set(),
  onToggleBreakpoint:  () => {},
});
