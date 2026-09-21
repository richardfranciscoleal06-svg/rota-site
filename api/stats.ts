import { handler } from '../netlify/functions/stats';
import { toVercelHandler } from '../_server/adapter';

export default toVercelHandler(handler);
