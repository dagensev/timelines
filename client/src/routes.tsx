import { createBrowserRouter } from 'react-router';
import App from './App';
import Room from './pages/[roomId]';

export const Routes = createBrowserRouter([
    {
        path: '/',
        Component: App,
    },
    {
        path: '/room/:roomId',
        Component: Room,
    },
]);
