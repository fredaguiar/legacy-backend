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
