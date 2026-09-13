import { BrowserRouter } from 'react-router-dom';

import { AppRoutes } from '@/routes/AppRoutes';

const App = (): JSX.Element => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
