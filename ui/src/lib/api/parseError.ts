
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseError = (error: any, fallback="Failed. Please try again later"): string => {
	const errorMessage = error?.response?.data?.message || error?.message || fallback;
	const isArray = Array.isArray(errorMessage);
	const message = isArray ? errorMessage.join(",") : errorMessage;
	
	return message || fallback;
};