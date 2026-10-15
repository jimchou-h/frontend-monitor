export enum EActionType {
  PAGE = 'PAGE',
  EVENT = 'EVENT',
  VIEW = 'VIEW',
  DURATION = 'DURATION',
  DURATION_VIEW = 'DURATION_VIEW',
  OTHER = 'OTHER',
}

export interface ITrackBaseParam {
  trackId?: string;
  custom?: string | { [prop: string]: string | number | boolean };
  [key: string]: any;
}

export interface TrackReportData extends ITrackBaseParam {
  id?: string;
  trackId?: string;
  actionType: EActionType;
  startTime?: number;
  durationTime?: number;
  trackTime?: number;
  page?: string;
  value?: number;
  isVital?: boolean;
  vital?: {
    name: string;
    value: number;
    rating: string;
    page?: string;
  };
}
