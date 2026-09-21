import { handler } from '../netlify/functions/pending';
import { toVercelHandler } from '../_server/adapter';

export default toVercelHandler(handler);
