require('dotenv').config();
const { ObjectId } = require('mongodb');
const http = require('http');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const { createStripeCustomerAndUpdateDB, verifyCardAndUpdateDB } = require('./Team3/stripe.js');
const {updateListings } = require('./Team3/UC8update_listings.js'); 
const {deleteListings  } = require('./Team3/UC8update_listings.js'); 
const { addProduct } = require('./Team3/UCCreateProduct.js');
const { updateDiscount } = require('./Team3/UC10DiscountManagement.js');
const { discountByType } = require('./Team3/UC10DiscountManagement.js');
const { discountByBrand } = require('./Team3/UC10DiscountManagement.js');

const { updateListings } = require('./Team3/UC8update_listings.js'); 
const { addProduct } = require('./Team3/UCCreateProduct.js');
const { updateDiscount } = require('./Team3/UC10DiscountManagement.js');
const { fetchTopRatedProducts } = require('./Team3/UC10DiscountManagement.js'); 

const { 
    updateUserEmail,
    // this is a change 
    updateUserName,
    updateUserPhoneNumber,
    updateUserPremiumStatus,
    addUserShippingAddress,
    updateUserShippingAddress
} = require('./Team1/userProfile');
const { startChat } = require('./Team1/chatSupport.js');
const { createPremiumMembership, cancelPremiumMembership } = require('./Team1/membershipManagement.js');
const { registerUser } = require('./Team1/Reg_lgn/registration');
const { getAccessTokenFromCode, getUserInfo } = require('./Team1/Reg_lgn/oAuthHandler');

// Initialize chat instance before starting server
let chatInstance = null;
startChat().then(chat => {
    chatInstance = chat;
}).catch(error => console.error('Failed to start chat:', error));


const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');
    
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    req.on('data', (data) => {
        buffer += decoder.write(data);
    });

    req.on('end', async () => {
        buffer += decoder.end();

        if (req.method === 'POST') {
            try {
                const requestBody = JSON.parse(buffer);
                let result = null;

                switch (trimmedPath) {
                    case 'update-listings':
                            console.log("Received productIds for update:", requestBody.productIds);
                            console.log("Received update fields:", requestBody.updateFields);
                            console.log("Received fields to remove:", requestBody.unsetFields); // Log the fields to remove
                        
                            if (!Array.isArray(requestBody.productIds) || 
                                typeof requestBody.updateFields !== 'object' ||
                                requestBody.productIds.some(id => !ObjectId.isValid(id)) ||
                                (requestBody.unsetFields && !Array.isArray(requestBody.unsetFields))) { // Check if unsetFields is an array if it exists
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ message: 'Invalid input for updating listings' }));
                                return;  
                            }
                        
                            result = await updateListings(requestBody.productIds, requestBody.updateFields, requestBody.unsetFields); // Pass the unsetFields as well
                            break;
                            case 'delete-listings':
                                console.log("Received productIds for deletion:", requestBody.productIds);
                                if (!Array.isArray(requestBody.productIds) || 
                                    requestBody.productIds.some(id => !ObjectId.isValid(id))) {
                                    res.writeHead(400, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ message: 'Invalid input for deleting listings' }));
                                    return;
                                }
                                try {
                                    const result = await deleteListings(requestBody.productIds);
                                    // Assuming deleteListings function returns the result of deletion operation,
                                    // you can further process this result or directly send a success response
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ message: 'Listings deleted successfully', result }));
                                } catch (error) {
                                    console.error("An error occurred during the deletion operation:", error);
                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ message: 'Internal server error' }));
                                }
                                return;                            
                            case 'create-stripe-customer':
                                const { userObjectId, email, name } = requestBody;
                                createStripeCustomerAndUpdateDB(userObjectId, email, name)
                                    .then(customerResult => {
                                        if (!res.headersSent) {
                                            res.writeHead(200, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({ success: true, data: customerResult }));
                                        }
                                    })
                                    .catch(error => {
                                        console.error("Error creating Stripe customer:", error);
                                        if (!res.headersSent) {
                                            res.writeHead(500, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({ success: false, message: 'Failed to create Stripe customer', error: error.message }));
                                        }
                                    });
                                return; // Prevent further execution
                            // Add new case for verifying card details
                            case 'verify-card-details':
                                try {
                                    const { userObjectId, stripeCustomerId, stripeToken } = requestBody;
                                    const verifyResult = await verifyCardAndUpdateDB(userObjectId, stripeCustomerId, stripeToken);
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: true, data: verifyResult }));
                                } catch (error) {
                                    console.error("Error verifying card details:", error);
                                    if (!res.headersSent) {
                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ success: false, message: 'Failed to verify card details', error: error.message }));
                                    }
                                }
                                return; // Exit the function after handling the request
                    // userProfile.js
                    case 'update-email':
                        result = await updateUserEmail(requestBody.userId, requestBody.newEmail);
                        break;    
                    case 'update-email':
                        result = await updateUserEmail(requestBody.userId, requestBody.newEmail);
                        break;
                    case 'update-listings':
                        if (!Array.isArray(requestBody.productIds) ||
                            typeof requestBody.updateFields !== 'object' ||
                            requestBody.productIds.some(id => !ObjectId.isValid(id)) ||
                            (requestBody.unsetFields && !Array.isArray(requestBody.unsetFields))) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: 'Invalid input for updating listings' }));
                            return;  
                        }
                        result = await updateListings(requestBody.productIds, requestBody.updateFields, requestBody.unsetFields);
                        break;
                    case 'update-name':
                        result = await updateUserName(requestBody.userId, requestBody.newName);
                        break;
                    case 'update-phone-number':
                        result = await updateUserPhoneNumber(requestBody.userId, requestBody.newPhoneNumber);
                        break;
                    case 'update-premium-status':
                        result = await updateUserPremiumStatus(requestBody.userId, requestBody.isPremium);
                        break;
                    case 'add-shipping-address':
                        result = await addUserShippingAddress(requestBody.userId, requestBody.newAddress);
                        break;
                    case 'update-shipping-address':
                        result = await updateUserShippingAddress(requestBody.userId, requestBody.addressId, requestBody.updatedAddress);
                        break;
                    case 'update-discount':
                            // Make sure requestBody has the necessary fields
                            if (!requestBody._id || typeof requestBody.discountPercentage === 'undefined') {
                                throw new Error('Both _id and discountPercentage are required');
                            }
                            result = await updateDiscount(requestBody._id, requestBody.discountPercentage);
                        break;
                    case 'discount-by-brand':
                            if (!requestBody.brand || typeof requestBody.discountPercentage === 'undefined') {
                                throw new Error('Both brand and discountPercentage are required');
                            }
                            result = await discountByBrand(requestBody.brand, requestBody.discountPercentage);
                        break;
                        
                    case 'discount-by-type':
                            if (!requestBody.type || typeof requestBody.discountPercentage === 'undefined') {
                                throw new Error('Both type and discountPercentage are required');
                            }
                            result = await discountByType(requestBody.type, requestBody.discountPercentage);
                        break;
                        
        
                    case 'add-product':
                        result = await addProduct(requestBody);
                        break;

                    case 'registerUser':
                        const accessToken = requestBody.accToken; // part of post request JSON
                        if (!accessToken) {
                            throw new Error('Not able to authorize'); // maybe give res writehead here
                        }
                        try {
                            // exchanging code for for access Token
                            // const accessToken = await getAccessTokenFromCode(authCode);

                            // use access token to get user's info from google account
                            const userInfo = await getUserInfo(accessToken);

                            //use the info we got to finish registering the user
                            result = await registerUser(userInfo, requestBody);
                        } catch (oauthError) {
                            // handling auth errors
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: 'OAuth Error', error: oauthError.message }));
                            return;
                        }
                        break;

                    // chatSupport.js
                    case 'send-chat-message':
                        if (!chatInstance) {
                            res.writeHead(503, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: 'Chat service is not available' }));
                            return;
                        }
                        try {
                            const chatResponse = await chatInstance.handleIncomingMessage(requestBody.message);
                            result = { reply: chatResponse };
                        } catch (error) {
                            console.error('Error during chat message handling:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: 'Failed to handle chat message', error: error.toString() }));
                            return;
                        }
                        break;
                    
                    // membershipManagement.js
                    case 'create-premium-membership':
                        if (!requestBody.userId) {
                            throw new Error('Missing userId for creating premium membership');
                        }
                        result = await createPremiumMembership(requestBody.userId);
                        break;
                    case 'cancel-premium-membership':
                        if (!requestBody.userId) {
                            throw new Error('Missing userId for cancelling premium membership');
                        }
                        result = await cancelPremiumMembership(requestBody.userId);
                        break;
                              
                    case 'update-discount':
                        if (!requestBody._id || !requestBody.discountPercentage) {
                            throw new Error('Both _id and discountPercentage are required');
                        }
                        result = await updateDiscount(requestBody._id, requestBody.discountPercentage);
                        break;
                    default:
                        throw new Error('Route not found');
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Operation successful', data: result }));
            } catch (error) {
                console.error("Error handling POST request:", error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Error handling request', error: error.toString() }));
            }
        } else if (req.method === 'GET' && trimmedPath === 'fetch-product-performance') {
            try {
                const result = await fetchTopRatedProducts();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Operation successful', data: result }));
            } catch (error) {
                console.error("Error handling GET request:", error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Error handling request', error: error.toString() }));
            }
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Not Found' }));
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// this a change
