import { handler } from '../netlify/functions/logout';
import { toVercelHandler } from '../_server/adapter';

export default toVercelHandler(handler);
