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
  lifeCheck?: boolean;
  safes: Array<TSafe>;
};

type TSafe = {
  name: string;
  description?: string;
  autoSharing?: boolean;
  _id?: Types.ObjectId;
};

type TPassword = {
  title: string;
  username: string;
  password: string;
  notes?: string;
  safeId: string;
  fileId?: string;
};
