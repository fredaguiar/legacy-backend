export const emailBodyLifeCheck = ({ firstName, url }: { firstName: string; url: string }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Are you doing ok?</title>
</head>
<body>
    <p>Hi ${firstName}, please confirm you received this message?</p>
    <p><a href=${url}>Yes</a></p>
</body>
</html>
`;
