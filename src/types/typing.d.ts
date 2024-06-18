type TUser = {
  _id?: Types.ObjectId;
  firstName: string;
  lastName: string;
  language: string;
  country: Country;
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
    shareTime?: date;
    shareWeekday?: string;
    shareCount?: number;
    shareCountType?: string;
    shareCountNotAnswered?: number;
  };
  safes: Array<TSafe>;
};

type TUserProfile = Omit<TUser, '_id' | 'password' | 'token' | 'safes'>;

type TUserFieldsToUpdate =
  | 'firstName'
  | 'lastName'
  | 'language'
  | 'country'
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
  | 'lifeCheck.shareWeekday'
  | 'lifeCheck.shareCount'
  | 'lifeCheck.shareCountType'
  | 'lifeCheck.shareCountNotAnswered';

type TCredentials = {
  email: string;
  password: string;
};

type Country = 'BR' | 'USA';

type TSafe = {
  name?: string;
  description?: string;
  autoSharing?: boolean;
  emails?: Array<TContact>;
  phones?: Array<TContact>;
  files?: Array<TFile>;
  fieldToUpdate?: 'name' | 'description' | 'autoSharing';
  contactToUpdate?: 'emails' | 'phones';
  _id?: Types.ObjectId;
};

type TFileInfo = {
  id: string;
  fileName: string;
  length: number;
  uploadDate: Date;
  mimetype: string;
};

type TFileInfoListResult = {
  fileInfoList: TFileInfo[];
};

type TPassword = {
  title: string;
  username: string;
  password: string;
  notes?: string;
  safeId: string;
  fileId?: string;
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
  fileName: string;
  s3Key: string;
  mimetype: string;
  length: number;
  uploadDate: Date;
  _id?: Types.ObjectId;
};

type StorageInfo = {
  storageUsedInBytes: number;
  storageFileCount: number;
  storageQuotaInMB: number;
};
