import { orgAsyncStorage } from '../services/org-async-context';
import { OrgContextMiddleware } from './org-context.middleware';

describe('OrgContextMiddleware', () => {
	let middleware: OrgContextMiddleware;
	let mockNext: jest.Mock;

	beforeEach(() => {
		middleware = new OrgContextMiddleware();
		mockNext = jest.fn();
	});

	it('should initialize AsyncLocalStorage context and call next()', () => {
		const req = {} as any;

		middleware.use(req, {} as any, mockNext);

		expect(mockNext).toHaveBeenCalled();
	});

	it('should create an ALS store with null organizationId', () => {
		const req = {} as any;

		middleware.use(req, {} as any, () => {
			const store = orgAsyncStorage.getStore();
			expect(store).toBeDefined();
			expect(store?.organizationId).toBeNull();
			expect(store?.isSuperAdmin).toBe(false);
			expect(store?.impersonatedBy).toBeNull();
		});
	});

	it('should allow ALS store to be mutated inside the context', () => {
		const req = {} as any;

		middleware.use(req, {} as any, () => {
			const store = orgAsyncStorage.getStore();
			if (store) {
				store.organizationId = 'org-1';
				store.isSuperAdmin = true;
			}
			expect(store?.organizationId).toBe('org-1');
			expect(store?.isSuperAdmin).toBe(true);
		});
	});

	it('should always call next()', () => {
		middleware.use({} as any, {} as any, mockNext);
		expect(mockNext).toHaveBeenCalledTimes(1);
	});
});
