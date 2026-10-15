import { BreadCrumbCategory, BreadCrumbTypes } from '@frontend-monitor/shared';

export interface BreadcrumbPushData {
  type: BreadCrumbTypes;
  category?: BreadCrumbCategory;
  data: any;
  level?: string;
  time?: number;
}
