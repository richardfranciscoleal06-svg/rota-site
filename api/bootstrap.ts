import { handler } from '../netlify/functions/bootstrap';
import { toVercelHandler } from '../_server/adapter';

export default toVercelHandler(handler);
