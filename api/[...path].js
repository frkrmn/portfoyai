import dispatchApiRequest from "../server/api-router.mjs";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default dispatchApiRequest;
