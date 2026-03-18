
export interface ProfitWithdrawal {
	id: string;
	name: string;
	amount: number;
	category: string;
	withdrawal_date: string;
	notes?: string;
	created_at: string;
}

export interface ProfitWithdrawalListResponse {
	success: boolean;
	data: ProfitWithdrawal[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ProfitWithdrawalResponse {
	success: boolean;
	data: ProfitWithdrawal;
}
