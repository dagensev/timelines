import { createBrowserRouter } from 'react-router';
import App from './App';
import Home from './pages/Home/View';

export const Routes = createBrowserRouter([
    {
        path: '/',
        Component: App,
    },
    {
        path: '/login',
        Component: Home,
    },
]);
