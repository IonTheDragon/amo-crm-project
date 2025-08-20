require('dotenv').config();

const port = process.env.PORT;

const express = require('express');
const bodyParser = require('body-parser')
const app = express();

const db = require('./models');

app.set("view engine", "hbs");


app.use(bodyParser.json()); // support json encoded bodies
app.use(express.urlencoded({ extended: true })); // support encoded bodies

app.get('/', async (req, res) => {

  const deals = await db.Deal.findAll({ include: db.Contact });

  deals.forEach(function(element, index, array){
  		let status = '';
        switch (element.status) {
            case "79312090":
                status = "Первичный контакт";
                break;
            case "79312094":
                status = "Переговоры";
                break;
            case "79312098":
                status = "Принимают решение";
                break;
            case "142":
                status = "Успешно реализовано";
                break;
            case "143":
                status = "Закрыто и не реализовано";
                break;                        
        }

        element.status = status   	
  })

  res.render("index.hbs", {
      deals: deals
  });
});

app.get("/crm_auth", function(req, res){
	res.redirect("https://www.amocrm.ru/oauth?client_id=" + process.env.AMO_ID + "&state=state&mode=post_message")
});

app.get("/create", function(req, res){
    res.render("create.hbs");
});

app.post("/create", async (req, res) => {
         
    if(!req.body) return res.sendStatus(400);

    const name = req.body.name;
    const price = req.body.price;
    const status = req.body.status;
    const contact_name = req.body.contact_name;
    const contact_phone = req.body.contact_phone;
    const contact_email = req.body.contact_email;

    //console.log('Received data:', req.body)

	settings = await db.Settings.findOne({
	  where: {
	    name: "access_token",
	  },
	});

	if (settings !== null) {

		access_token = settings.value

		//contacts

	    response = await fetch(process.env.AMO_URL + '/api/v4/contacts?query=' + contact_phone, {
	        method: 'GET',
	        headers: {
	            'Authorization': `Bearer ${access_token}`,
	            "Content-Type": "application/json"
	        }
	    });

	    try {
	    	responseData = await response.json();
		} catch (error) {
			responseData = {
				"_embedded": {
					"contacts": []
				}
			}
		}

	    //console.log('Received data:', responseData)

	    if (responseData._embedded.contacts.length) {
	    	contact = responseData._embedded.contacts[0]

			dataToSend = [{
				"id": contact.id,
			    "name": contact_name,
			    "custom_fields_values": [
			        {
			            "field_id": 1795103,
			            "values": [
			                {
			                    "value": contact_phone,
			                    "enum_code": "WORK"
			                }
			            ]
			        },
			        {
			            "field_id": 1795105,
			            "values": [
			                {
			                    "value": contact_email,
			                    "enum_code": "WORK"
			                }
			            ]
			        }			        

			    ],				
			}]

		    response = await fetch(process.env.AMO_URL + '/api/v4/contacts', {
		        method: 'PATCH',
		        headers: {
		            'Authorization': `Bearer ${access_token}`,
		            "Content-Type": "application/json"
		        },
		        body: JSON.stringify(dataToSend)
		    });

		    responseData = await response.json();

		    //console.log('Received data:', responseData['validation-errors'][0]['errors'])
		    //console.log('Received data:', responseData)

	    } else {
			dataToSend = [{
			    "name": contact_name,
			    "custom_fields_values": [
			        {
			            "field_id": 1795103,
			            "values": [
			                {
			                    "value": contact_phone,
			                    "enum_code": "WORK"
			                }
			            ]
			        },
			        {
			            "field_id": 1795105,
			            "values": [
			                {
			                    "value": contact_email,
			                    "enum_code": "WORK"
			                }
			            ]
			        }			        

			    ],				
			}]

		    response = await fetch(process.env.AMO_URL + '/api/v4/contacts', {
		        method: 'POST',
		        headers: {
		            'Authorization': `Bearer ${access_token}`,
		            "Content-Type": "application/json"
		        },
		        body: JSON.stringify(dataToSend)
		    });

		    responseData = await response.json();		    
	    }

		contact_crm_id = contact.id

		//deals

	    response = await fetch(process.env.AMO_URL + '/api/v4/leads?filter[name]=' + name, {
	        method: 'GET',
	        headers: {
	            'Authorization': `Bearer ${access_token}`,
	            "Content-Type": "application/json"
	        }
	    });

	    //console.log('Received data:', response)

	    try {
	    	responseData = await response.json();
		} catch (error) {
			responseData = {
				"_embedded": {
					"leads": []
				}
			}
		}

	    if (responseData._embedded.leads.length) {
	    	lead = responseData._embedded.leads[0]

	    	//console.log('Received data:', lead._embedded)

	    	if ("contacts" in lead._embedded && lead._embedded.contacts.length) {
	    		contacts = lead._embedded.contacts

			    if (!contacts.find(contact => contact.id === contact_crm_id)) {
			      contacts.push({"id": contact_crm_id})
			    }

			} else {
				contacts = [
					{
						"id": contact_crm_id
					}
				]
			}

			dataToSend = [{
				"id": lead.id,
			    "name": name,
			    "price": parseInt(price),
			    "status_id": parseInt(status),
			    "_embedded": {
			    	"contacts": contacts
			    }				
			}]

		    response = await fetch(process.env.AMO_URL + '/api/v4/leads', {
		        method: 'PATCH',
		        headers: {
		            'Authorization': `Bearer ${access_token}`,
		            "Content-Type": "application/json"
		        },
		        body: JSON.stringify(dataToSend)
		    });

		    responseData = await response.json();

		    //console.log('Received data:', responseData['validation-errors'][0]['errors'])
	    } else {
			dataToSend = [{
			    "name": name,
			    "price": parseInt(price),
			    "status_id": parseInt(status),
			    "_embedded": {
			    	"contacts":
		    		[
		    			{"id": contact_crm_id}
		    		]
			    }				
			}]

		    response = await fetch(process.env.AMO_URL + '/api/v4/leads', {
		        method: 'POST',
		        headers: {
		            'Authorization': `Bearer ${access_token}`,
		            "Content-Type": "application/json"
		        },
		        body: JSON.stringify(dataToSend)
		    });

		    responseData = await response.json();	    
	    }	
	}		    

    res.redirect("/");
});



app.get("/get_token", async (req, res) => {

    const dataToSend = {
	  "client_id": process.env.AMO_ID,
	  "client_secret": process.env.AMO_SECRET,
	  "grant_type": "authorization_code",
	  "code": req.query.code,
	  "redirect_uri": process.env.AMO_REDIRECT_URI
	};

    try {
        const response = await fetch(process.env.AMO_URL + '/oauth2/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend)
        });

        const responseData = await response.json(); // or .text() if not JSON

        if ("access_token" in responseData) {

			settings = await db.Settings.findOne({
			  where: {
			    name: "access_token",
			  },
			});

			if (settings === null) {
				settings = await db.Settings.create(
					{ 
				      	name: "access_token",
			      		value: responseData.access_token
					}
				);
			} else {
				await db.Settings.update(
			      { 
			      	value: responseData.access_token
			      },
			      {
			        where: {
			          name: "access_token"
			        }, 
			      }
			    )				
			}

		}

        //console.log('Server response:', responseData);
    } catch (error) {
        console.error('Error sending data:', error);
    }			    

    res.redirect("/create");
});


app.post('/webhook', async (req, res) => {

    const data = req.body;

    if ("leads" in data) {
    	let leads = [];
	    if ("add" in data.leads) {
	    	//lead = data.leads.add[0]
	    	return res.status(200).json({status: 'success'});
	    }
	    if ("update" in data.leads) {
	    	leads = data.leads.update
	    }

	    if (leads.length) {
	    	for (let key in leads) {

	    		lead = leads[key]

				deal_db = await db.Deal.findOne({
				  where: {
				    crm_id: lead.id,
				  },
				});

				if (deal_db === null) {
					deal_db = await db.Deal.create(
						{ 
					      	name: lead.name,
					      	price: lead.price,
					      	status: lead.status_id,
					      	crm_id: lead.id, 
						}
					);
					//console.log('Received data:', deal_db)				
				} else {
					await db.Deal.update(
				      { 
				      	name: lead.name,
				      	price: lead.price,
				      	status: lead.status_id
				      },
				      {
				        where: {
				          crm_id: lead.id,
				        }, 
				      }
				    )
				}
			}
	    }	    
    }

    if ("contacts" in data) {
    	let contacts = []
	    if ("add" in data.contacts) {
	    	//contact = data.contacts.add[0]
	    	return res.status(200).json({status: 'success'});
	    }
	    if ("update" in data.contacts) {
	    	contacts = data.contacts.update
	    }

	    if (contacts.length) {

	    	for (let key in contacts) {

	    		contact = contacts[key]

			    let phone_obj = contact.custom_fields.filter(item => item.code === 'PHONE')

			    //console.log('Received data:', phone_obj)

			    let phone = '';
			    if (typeof phone_obj[0] != 'undefined' && "values" in phone_obj[0]) {
			    	phone = phone_obj[0]["values"][0]["value"]
				}

			    //console.log('Received data:', phone)

			    let email_obj = contact.custom_fields.filter(item => item.code === 'EMAIL')

			    let email = '';
			    if (typeof email_obj[0] != 'undefined' && "values" in email_obj[0]) {
			    	email = email_obj[0]["values"][0]["value"]
				}

				//console.log('Received data:', email)

				contact_db = await db.Contact.findOne({
				  where: {
				    crm_id: contact.id,
				  },
				});

				if (contact_db === null) {
					contact_db = await db.Contact.create(
						{ 
					      	name: contact.name,
				      		phone: phone,
				      		email: email,				      	
					      	crm_id: contact.id, 
						}
					);
				} else {
					await db.Contact.update(
				      { 
				      	name: contact.name,
				      	phone: phone,
				      	email: email
				      },
				      {
				        where: {
				          crm_id: contact.id,
				        }, 
				      }
				    )				
				}

			    if ("linked_leads_id" in contact) {
					for (linked_leads_id in contact.linked_leads_id) {

						deals = await db.Deal.findAll({
						  where: {
						    crm_id: linked_leads_id,
						  },
						});

						//console.log('Received data:', deals)

						if (deals.length) {

							deal_contact = await db.DealContact.findOne({
							  where: {
							    dealId: deals[0].id,
							    contactId: contact_db.id
							  },
							});

							if (deal_contact === null) {	

								//console.log('Received data:', deals[0].id)
								//console.log('Received data:', contact_db.id)

								await db.DealContact.create(
									{ 
									    DealId: deals[0].id,
									    ContactId: contact_db.id
									}
								);
							}
						}					
					}	    	
			    }

			}

		}	    
    }    	

	res.status(200).json({status: 'success'});
});

db.sequelize.sync().then(() => {
	app.listen(port, () => {
	  console.log(`Server listening at http://localhost:${port}`);
	});
});