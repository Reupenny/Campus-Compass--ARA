import React, { useState, useEffect } from 'react';
import './App.css';

interface ContactType {
    id: number;
    name: string;
    email: string;
    phone: string;
    hours: string;
    officeNumber: string;
    jobTitle: string;
}

function Contact({ contact, saveContact, deleteContact }: { contact: ContactType, saveContact: (id: number, updatedContact: ContactType) => void, deleteContact: (id: number) => void }) {
    return (
        <div>
            <input type="text" id={`name-${contact.id}`} defaultValue={contact.name} placeholder="Name" /><br />
            <input type="email" id={`email-${contact.id}`} defaultValue={contact.email} placeholder="Email" /><br />
            <input type="tel" id={`phone-${contact.id}`} defaultValue={contact.phone} placeholder="Phone" /><br />
            <input type="text" id={`hours-${contact.id}`} defaultValue={contact.hours} placeholder="Hours" /><br />
            <input type="text" id={`office-${contact.id}`} defaultValue={contact.officeNumber} placeholder="Office Number" /><br />
            <input type="text" id={`job-${contact.id}`} defaultValue={contact.jobTitle} placeholder="Job Title" /><br />
            <button onClick={() => {
                const updatedContact = {
                    id: contact.id,
                    name: (document.getElementById(`name-${contact.id}`) as HTMLInputElement).value,
                    email: (document.getElementById(`email-${contact.id}`) as HTMLInputElement).value,
                    phone: (document.getElementById(`phone-${contact.id}`) as HTMLInputElement).value,
                    hours: (document.getElementById(`hours-${contact.id}`) as HTMLInputElement).value,
                    officeNumber: (document.getElementById(`office-${contact.id}`) as HTMLInputElement).value,
                    jobTitle: (document.getElementById(`job-${contact.id}`) as HTMLInputElement).value,
                };
                saveContact(contact.id, updatedContact);
            }}>Save</button>
            <button onClick={() => deleteContact(contact.id)}>Delete</button>
        </div>
    );
}

function ContactList({ contacts, saveContact, deleteContact }: { contacts: ContactType[], saveContact: (id: number, updatedContact: ContactType) => void, deleteContact: (id: number) => void }) {
    return (
        <div>
            {contacts.map(contact => (
                <Contact key={contact.id} contact={contact} saveContact={saveContact} deleteContact={deleteContact} />
            ))}
        </div>
    );
}

function AddContactForm({ addContact }: { addContact: (newContact: Omit<ContactType, 'id'>) => void }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [hours, setHours] = useState('');
    const [officeNumber, setOfficeNumber] = useState('');
    const [jobTitle, setJobTitle] = useState('');

    return (
        <div>
            <h2>Add New Contact</h2>
            <input type="text" id="new-name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} /><br />
            <input type="email" id="new-email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /><br />
            <input type="tel" id="new-phone" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} /><br />
            <input type="text" id="new-hours" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} /><br />
            <input type="text" id="new-office" placeholder="Office Number" value={officeNumber} onChange={(e) => setOfficeNumber(e.target.value)} /><br />
            <input type="text" id="new-job" placeholder="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /><br />
            <button onClick={() => {
                addContact({ name, email, phone, hours, officeNumber, jobTitle });
                setName('');
                setEmail('');
                setPhone('');
                setHours('');
                setOfficeNumber('');
                setJobTitle('');
            }}>Add Contact</button>
        </div>
    );
}

function App() {
    const [contacts, setContacts] = useState<ContactType[]>([]);
    const [lastId, setLastId] = useState<number>(0);

    useEffect(() => {
        loadContacts();
    }, []);

    async function loadContacts() {
        const response = await fetch('/knowledge/contacts.json');
        const data = await response.json();
        setContacts(data.contacts);
        setLastId(data.lastId);
    }

    async function addContact(newContact: Omit<ContactType, 'id'>) {
        const updatedLastId = lastId + 1;
        const updatedContacts = [...contacts, { id: updatedLastId, ...newContact }];
        await saveContacts(updatedContacts, updatedLastId);
        setContacts(updatedContacts);
        setLastId(updatedLastId);
    }

    async function saveContact(id: number, updatedContact: ContactType) {
        const contactIndex = contacts.findIndex(c => c.id === id);
        if (contactIndex === -1) {
            alert('Contact not found.');
            return;
        }

        const updatedContacts = [...contacts];
        updatedContacts[contactIndex] = updatedContact;
        await saveContacts(updatedContacts, lastId);
        setContacts(updatedContacts);
    }

    async function deleteContact(id: number) {
        const updatedContacts = contacts.filter(c => c.id !== id);
        await saveContacts(updatedContacts, lastId);
        setContacts(updatedContacts);
    }

    async function saveContacts(contacts: ContactType[], lastId: number) {
        const newData = { contacts, lastId };

        try {
            const response = await fetch('/save-contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData)
            });

            if (!response.ok) {
                throw new Error('Failed to save contacts.');
            }

            alert('Contacts saved successfully!');
        } catch (error) {
            alert('Error saving contacts: ' + error.message);
        }
    }

    return (
        <>
            <h1>Admin App</h1>
            <AddContactForm addContact={addContact} />
            <ContactList contacts={contacts} saveContact={saveContact} deleteContact={deleteContact} />
        </>
    );
}

export default App;
