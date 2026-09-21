import { handler } from '../netlify/functions/register';
import { toVercelHandler } from '../_server/adapter';

export default toVercelHandler(handler);
