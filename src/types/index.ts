export interface Bill {
  congress: number;
  number: string;
  type: string;
  title: string;
  introducedDate: string;
  latestAction?: {
    actionDate: string;
    text: string;
  };
  sponsors?: Array<{
    firstName: string;
    lastName: string;
    party: string;
    state: string;
    district?: number;
  }>;
  summary?: {
    text: string;
  };
  url: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export interface CongressApiResponse {
  bills: Array<{
    congress: number;
    number: string;
    type: string;
    title: string;
    introducedDate: string;
    latestAction?: {
      actionDate: string;
      text: string;
    };
    sponsors?: Array<{
      firstName: string;
      lastName: string;
      party: string;
      state: string;
      district?: number;
    }>;
    summary?: {
      text: string;
    };
    url: string;
  }>;
  pagination: {
    count: number;
    next?: string;
  };
}