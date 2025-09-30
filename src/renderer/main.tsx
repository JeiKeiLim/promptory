/**
 * React 앱 엔트리 포인트
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// React 18 방식으로 앱 마운트
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

