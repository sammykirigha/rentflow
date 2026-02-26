export interface DarajaOAuthResponse {
	access_token: string;
	expires_in: string;
}

export interface StkPushRequest {
	BusinessShortCode: string;
	Password: string;
	Timestamp: string;
	TransactionType: 'CustomerPayBillOnline';
	Amount: number;
	PartyA: string;
	PartyB: string;
	PhoneNumber: string;
	CallBackURL: string;
	AccountReference: string;
	TransactionDesc: string;
}

export interface StkPushResponse {
	MerchantRequestID: string;
	CheckoutRequestID: string;
	ResponseCode: string;
	ResponseDescription: string;
	CustomerMessage: string;
}

export interface StkCallbackItem {
	Name: string;
	Value?: string | number;
}

export interface StkCallbackBody {
	Body: {
		stkCallback: {
			MerchantRequestID: string;
			CheckoutRequestID: string;
			ResultCode: number;
			ResultDesc: string;
			CallbackMetadata?: {
				Item: StkCallbackItem[];
			};
		};
	};
}

export interface C2bBody {
	TransactionType: string;
	TransID: string;
	TransTime: string;
	TransAmount: string;
	BusinessShortCode: string;
	BillRefNumber: string;
	InvoiceNumber: string;
	OrgAccountBalance: string;
	ThirdPartyTransID: string;
	MSISDN: string;
	FirstName: string;
	MiddleName: string;
	LastName: string;
}

export interface C2bRegisterUrlRequest {
	ShortCode: string;
	ResponseType: 'Completed' | 'Cancelled';
	ConfirmationURL: string;
	ValidationURL: string;
}

export interface DarajaResultResponse {
	ResultCode: number;
	ResultDesc: string;
}
