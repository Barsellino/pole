import { Routes } from '@angular/router';
// ... existing code ...

export const routes: Routes = [
  {
    path: 'host',
    loadComponent: () =>
      import('./features/pole/pages/host/host').then(m => m.Host)
  },
  {
    path: 'display',
    loadComponent: () =>
      import('./features/pole/pages/display/display').then(m => m.Display)
  },
  // ... existing code ...
  { path: '', redirectTo: 'host', pathMatch: 'full' }
];
