type TUser = {
  _id?: Types.ObjectId;
  firstName: string;
  lastName: string;
  language: string;
  country: TCountry;
  timezone: string;
  email: string;
  phoneCountry: string;
  phone: string;
  password?: string;
  token?: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  mobileVerifyCode?: number;
  introductionViewed?: boolean;
  storageQuotaInMB?: number;
  lifeCheck: {
    active?: boolean;
    shareTime?: string;
    shareWeekdays?: [TWeekday];
    shareCount?: number;
    shareCountType?: TShareCountType;
    shareCountNotAnswered?: number;
    noAnswerCounter?: number;
  };
  safes: Array<TSafe>;
};

type TUserProfile = Omit<TUser, '_id' | 'password' | 'token' | 'safes'>;

type TUserFieldsToUpdate =
  | 'firstName'
  | 'lastName'
  | 'language'
  | 'country'
  | 'timezone'
  | 'email'
  | 'phoneCountry'
  | 'phone'
  | 'type: '
  | 'emailVerified'
  | 'mobileVerified'
  | 'introductionViewed'
  | 'storageQuotaInMB'
  | 'lifeCheck.active'
  | 'lifeCheck.shareTime'
  | 'lifeCheck.shareWeekdays'
  | 'lifeCheck.shareCount'
  | 'lifeCheck.shareCountType'
  | 'lifeCheck.shareCountNotAnswered';

type TCredentials = {
  email: string;
  password: string;
};

type TCountry = 'BR' | 'USA';

type TSafe = {
  name?: string;
  description?: string;
  autoSharing?: boolean;
  emails?: Array<TContact>;
  phones?: Array<TContact>;
  files?: Array<TFile>;
  fieldToUpdate?: 'name' | 'description' | 'autoSharing';
  contactToUpdate?: 'emails' | 'phones';
  searchMatch?: string;
  searchValue?: string;
  _id?: Types.ObjectId;
};

type TContact = {
  name: string;
  contact: string;
  type: string;
  _id: Types.ObjectId;
};

type TContactUpdate = {
  safeId: string;
  contactList: TContact[];
  deleteContactList: string[];
  contactType: 'emails' | 'phones';
};

type TFile = {
  userId?: Types.ObjectId;
  safeId?: Types.ObjectId;
  fileName: string;
  mimetype?: string;
  length?: number;
  username?: string;
  password?: string;
  notes?: string;
  uploadDate: Date;
  searchMatch?: string;
  searchValue?: string;
  content?: string;
  _id?: Types.ObjectId | string;
};

type TUploadFileToBucket = {
  mimetype: string;
  filePath: string;
  buffer: Buffer;
};

type TUploadFilesResult = {
  name: string;
  type: string;
};

type TFileInfoListResult = {
  fileInfoList: TFile[];
};

type StorageInfo = {
  storageUsedInBytes: number;
  storageFileCount: number;
  storageQuotaInMB: number;
};

type TShareCountType = 'days' | 'hours' | 'weeks';

type TWeekday = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
