import Mail from 'nodemailer/lib/mailer';

export const emailConfirm = ({ firstName, url }: { firstName: string; url: string }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Legacy</title>
</head>
<body>
    <p>Hi ${firstName}, this is a message from Legacy. Please confirm your email.</p>
    <p><a href=${url}>Click here to confirm.</a></p>
</body>
</html>
`;

export const emailBodyLifeCheck = ({ firstName, url }: { firstName: string; url: string }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Legacy</title>
</head>
<body>
    <p>Hi ${firstName}, this is a message from Legacy, please confirm you received this message.</p>
    <p><a href=${url}>Click here to confirm.</a></p>
</body>
</html>
`;

export const emailChecked = ({ message }: { message: string }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Legacy</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            align-items: flex-start;
            justify-content: center;
        }
        p {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <p>${message}</p>
</body>
</html>
`;

export const smsBodyLifecheck = ({ firstName, url }: { firstName: string; url: string }) => {
  return `
Hi ${firstName}, this is a message from Legacy, please confirm you received this message.\n
Click on the link below to confirm: \n\n${url}
`;
};

export const smsConfirmPhone = ({
  firstName,
  verifyCode,
}: {
  firstName: string;
  verifyCode: number;
}) => {
  return `Hi ${firstName}, This is your Legacy verification code: ${verifyCode}.\n`;
};

export const emailBodyToContacts = ({
  firstName,
  lastName,
  attachments,
}: {
  firstName: string;
  lastName: string;
  attachments: Mail.Attachment[];
}) => {
  const links = attachments
    .map(
      (attachment) =>
        `<li style="margin: 5px"><a href="${attachment.path}">${attachment.filename}</a></li>`,
    )
    .join('');

  return `
<p>This is a message regarding <strong>${firstName} ${lastName}</strong></p>
<p>The following files have been shared with you:</p><ul>${links}</ul>
`;
};

export const smsBodyToContacts = ({
  firstName,
  lastName,
  attachments,
}: {
  firstName: string;
  lastName: string;
  attachments: Mail.Attachment[];
}) => {
  const links = attachments
    .map((attachment) => `${attachment.filename} \n${attachment.path}`)
    .join('\n\n');

  return `
This is a message regarding ${firstName} ${lastName}\n
The following files have been shared with you:\n\n
${links}
`;
};
