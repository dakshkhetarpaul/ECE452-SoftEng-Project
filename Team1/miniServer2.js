const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { v4: uuidv4 } = require('uuid');
const { connectDBandClose } = require("../dbConfig");
const { getUserInfo } = require('./Reg_lgn/oAuthHandler.js');
// const {registerUser}=require('./Reg_lgn/regLogin');
const { verifyAddress } = require('../Team2/AddressValidationAPI.js');

const PORT = 3000;

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    console.log('Request for:', pathname);

    if (pathname === '/get-user-profile' && req.method === 'GET') {
        // Handle the GET request for user profile
        await getUserProfile(req, res);
    } else if (pathname === '/oauth2callback' || pathname === '/' || pathname === '/landing.css' || pathname === '/landing.js') {
        if (pathname === '/landing.css' || pathname === '/landing.js') {
            serveFile('Team1/Reg_lgn/landing' + pathname, res);
        } else {
            serveFile('Team1/Reg_lgn/landing/landingPage.html', res);
        }
    } else if (req.method === 'POST') {
        handlePostRequests(req, res, pathname);
    } else {
        // Serve files based on the actual path, adjusting for non-root requests
        serveFile('Team1' + pathname, res);
    }
});

function serveFile(filePath, res) {

    console.log('Serving file:', filePath);  // Log which file is being served
    const extname = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';
    fs.readFile(filePath, (error, content) => {
        if (error) {
            console.error('File error:', error);
            res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/html' });
            res.end(error.code === 'ENOENT' ? '404 Not Found' : 'Server error');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

async function getUserProfile(req, res) {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Unauthorized: No access token provided' }));
        return;
    }

    try {
        const userInfo = await getUserInfo(accessToken);
        const { db, client } = await connectDBandClose();
        const user = await db.collection('users').findOne({ email: userInfo.email });
        client.close();

        if (user) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(user));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'User not found' }));
        }
    } catch (error) {
        console.error('Database error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
    }
}


function handlePostRequests(req, res, pathname) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        if (pathname === '/check-user') {
            const userInfo = JSON.parse(body);
            checkUser(userInfo, res);
        } else if (pathname === '/registerUser') {
            const userRegistrationInfo = JSON.parse(body);
            registerUser(userRegistrationInfo, res);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint not found' }));
        }
    });
}

async function registerUser(userData, res) {
    try {
        // console.log("here is data coming in: ", userData);
        const { name, email, address } = userData;
        // console.log("here is address we get: ", address)
        // console.log("type: ", typeof address)
        // // Extract the necessary fields for address verification
        // const addressForVerification = {
        //     street: address.street,
        //     city: address.city,
        //     state: address.state,
        //     postalCode: address.postalCode,
        //     country: address.country
        // };

        // console.log("Address for verification: ", addressForVerification, addressForVerification.type);

        const validationResponse = await verifyAddress(address);  // Expecting an address object
        if (!validationResponse.isValid) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: validationResponse.message }));
            return;
        }

        const user = {
            email,
            name,
            shippingAddresses: [{ ...address, addressId: require('uuid').v4() }],
            shoppingCart: { cartId: '', items: [], cartSubtotal: 0 },
            watchlist: [],
            orderHistory: [],
            reviews: [],
            about: [userData.personal1, userData.personal2]
        };

        const { db, client } = await connectDBandClose();
        const result = await db.collection('users').insertOne(user);
        client.close();

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'User registered successfully', userId: result.insertedId }));
    } catch (error) {
        console.error('Error registering user:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
    }
}



async function checkUser(userInfo, res) {
    try {
        const { db, client } = await connectDBandClose();
        const usersCollection = db.collection("users");
        const user = await usersCollection.findOne({ email: userInfo.email });
        client.close();  // Ensure closing the database connection

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ exists: !!user }));
    } catch (error) {
        console.error('Database error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
}

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});