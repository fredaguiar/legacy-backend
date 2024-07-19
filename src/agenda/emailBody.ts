export const emailBodyLifeCheck = ({ firstName, url }: { firstName: string; url: string }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Legacy</title>
</head>
<body>
    <p>Hi ${firstName}, this is a message from Legacy, please confirm you received this message?</p>
    <p><a href=${url}>Click here to confirm.</a></p>
</body>
</html>
`;
