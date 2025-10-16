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

interface CharacterTone {
    name: string;
    description: string;
    principles: string[];
}

interface CharacterData {
    character_tones: CharacterTone[];
}

interface TemplateData {
    [key: string]: string;
}

function Contact({ contact, saveContact, deleteContact }: { contact: ContactType, saveContact: (id: number, updatedContact: ContactType) => void, deleteContact: (id: number) => void }) {
    return (
        <div style={{ border: '1px solid #ddd', padding: '10px', margin: '10px', borderRadius: '5px' }}>
            <input type="text" id={`name-${contact.id}`} defaultValue={contact.name} placeholder="Name" style={{ width: '100%', margin: '5px 0' }} /><br />
            <input type="email" id={`email-${contact.id}`} defaultValue={contact.email} placeholder="Email" style={{ width: '100%', margin: '5px 0' }} /><br />
            <input type="tel" id={`phone-${contact.id}`} defaultValue={contact.phone} placeholder="Phone" style={{ width: '100%', margin: '5px 0' }} /><br />
            <input type="text" id={`hours-${contact.id}`} defaultValue={contact.hours} placeholder="Hours" style={{ width: '100%', margin: '5px 0' }} /><br />
            <input type="text" id={`office-${contact.id}`} defaultValue={contact.officeNumber} placeholder="Office Number" style={{ width: '100%', margin: '5px 0' }} /><br />
            <input type="text" id={`job-${contact.id}`} defaultValue={contact.jobTitle} placeholder="Job Title" style={{ width: '100%', margin: '5px 0' }} /><br />
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
                }} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px' }}>Save</button>
                <button onClick={() => deleteContact(contact.id)} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px' }}>Delete</button>
            </div>
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

function Chat({ currentTab }: {
    currentTab: 'contacts' | 'character' | 'templates' | 'ara' | 'computing' | 'student-handbook'
}) {
    const [contacts, setContacts] = useState<ContactType[]>([]);
    const [lastId, setLastId] = useState<number>(0);
    const [selectedContact, setSelectedContact] = useState<ContactType | null>(null);
    const [characterData, setCharacterData] = useState<CharacterData>({ character_tones: [] });
    const [templateData, setTemplateData] = useState<Record<string, string>>({});
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [newTemplateName, setNewTemplateName] = useState<string>('');
    const [araData, setAraData] = useState<string>('');
    const [computingData, setComputingData] = useState<string>('');
    const [studentHandbookData, setStudentHandbookData] = useState<string>('');

    useEffect(() => {
        fetchContacts();
        fetchCharacterData();
        fetchTemplateData();
        fetchAraData();
        fetchComputingData();
        fetchStudentHandbookData();
    }, []);

    async function fetchContacts() {
        try {
            const response = await fetch('/knowledge/contacts.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            if (!text.trim()) {
                throw new Error('Empty response from server');
            }
            const data = JSON.parse(text);
            setContacts(data.contacts || []);
            setLastId(data.lastId || 0);
        } catch (error) {
            console.error('Error fetching contacts:', error);
            setContacts([]);
            setLastId(0);
        }
    }

    async function fetchCharacterData() {
        try {
            const response = await fetch('/knowledge/character.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setCharacterData(data);
        } catch (error) {
            console.error('Error fetching character data:', error);
            setCharacterData({ character_tones: [] });
        }
    }

    async function fetchTemplateData() {
        try {
            const response = await fetch('/knowledge/templates.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setTemplateData(data);
            // Set the first template as selected by default
            const templateKeys = Object.keys(data);
            if (templateKeys.length > 0 && !selectedTemplate) {
                setSelectedTemplate(templateKeys[0]);
            }
        } catch (error) {
            console.error('Error fetching template data:', error);
            setTemplateData({});
        }
    }

    async function fetchAraData() {
        try {
            const response = await fetch('/knowledge/ara.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setAraData(JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error fetching ara data:', error);
            setAraData('');
        }
    }

    async function fetchComputingData() {
        try {
            const response = await fetch('/knowledge/computing.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setComputingData(JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error fetching computing data:', error);
            setComputingData('');
        }
    }

    async function fetchStudentHandbookData() {
        try {
            const response = await fetch('/knowledge/student-handbook.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setStudentHandbookData(JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error fetching student handbook data:', error);
            setStudentHandbookData('');
        }
    }

    async function addContact(newContact: Omit<ContactType, 'id'>) {
        const updatedLastId = lastId + 1;
        const contactWithId = { ...newContact, id: updatedLastId };
        const updatedContacts = [...contacts, contactWithId];

        await saveContacts(updatedContacts, updatedLastId);
        setContacts(updatedContacts);
        setLastId(updatedLastId);
        setSelectedContact(contactWithId); // Auto-select the new contact
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert('Error saving contacts: ' + errorMessage);
        }
    }

    async function saveCharacterData() {
        try {
            const response = await fetch('/save-character', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(characterData)
            });

            if (!response.ok) {
                throw new Error('Failed to save character data.');
            }

            alert('Character data saved successfully!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert('Error saving character data: ' + errorMessage);
        }
    }

    async function saveTemplateData() {
        try {
            const response = await fetch('/save-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(templateData)
            });

            if (!response.ok) {
                throw new Error('Failed to save template data.');
            }

            alert('Template data saved successfully!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert('Error saving template data: ' + errorMessage);
        }
    }

    const addNewTemplate = () => {
        if (newTemplateName.trim()) {
            const updatedTemplates = { ...templateData, [newTemplateName]: '' };
            setTemplateData(updatedTemplates);
            setSelectedTemplate(newTemplateName);
            setNewTemplateName('');
        }
    };

    const deleteTemplate = (templateName: string) => {
        if (confirm(`Are you sure you want to delete the "${templateName}" template?`)) {
            const updatedTemplates = { ...templateData };
            delete updatedTemplates[templateName];
            setTemplateData(updatedTemplates);

            // Select another template if the deleted one was selected
            if (selectedTemplate === templateName) {
                const remainingKeys = Object.keys(updatedTemplates);
                setSelectedTemplate(remainingKeys.length > 0 ? remainingKeys[0] : '');
            }
        }
    };

    const saveSelectedContact = () => {
        if (selectedContact) {
            saveContact(selectedContact.id, selectedContact);
        }
    };

    const createNewContact = () => {
        const newContact: ContactType = {
            id: 0, // Will be set by addContact
            name: 'New Contact',
            email: '',
            phone: '',
            hours: '',
            officeNumber: '',
            jobTitle: ''
        };
        addContact(newContact);
        // The new contact will be automatically selected when the contacts list updates
    };

    async function saveAraData() {
        try {
            const parsedData = JSON.parse(araData);
            const response = await fetch('/save-ara', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsedData)
            });

            if (!response.ok) {
                throw new Error('Failed to save ARA data.');
            }

            alert('ARA data saved successfully!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert('Error saving ARA data: ' + errorMessage);
        }
    }

    async function saveComputingData() {
        try {
            const parsedData = JSON.parse(computingData);
            const response = await fetch('/save-computing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsedData)
            });

            if (!response.ok) {
                throw new Error('Failed to save computing data.');
            }

            alert('Computing data saved successfully!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert('Error saving computing data: ' + errorMessage);
        }
    }

    async function saveStudentHandbookData() {
        try {
            const parsedData = JSON.parse(studentHandbookData);
            const response = await fetch('/save-student-handbook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsedData)
            });

            if (!response.ok) {
                throw new Error('Failed to save student handbook data.');
            }

            alert('Student handbook data saved successfully!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert('Error saving student handbook data: ' + errorMessage);
        }
    }

    return (
        <div className="chat-content">
            {/* Tab Content */}
            {currentTab === 'contacts' && (
                <div>
                    <h2>Staff Contacts Management</h2>

                    <div className="split-panel">
                        {/* Contact List */}
                        <div className="panel-left">
                            <div className="form-group">
                                <button
                                    onClick={createNewContact}
                                    className="btn btn-success btn-full"
                                >
                                    + Add New Contact
                                </button>
                            </div>
                            <div className="contact-list">
                                {contacts.map(contact => (
                                    <div
                                        key={contact.id}
                                        onClick={() => setSelectedContact(contact)}
                                        className={`contact-item ${selectedContact?.id === contact.id ? 'contact-selected' : ''}`}
                                    >
                                        <div className="contact-name">{contact.name || 'Unnamed Contact'}</div>
                                        <div className="contact-details">{contact.jobTitle}</div>
                                        <div className="contact-details">{contact.officeNumber}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Contact Editor */}
                        <div className="panel-right">
                            {selectedContact ? (
                                <div>
                                    <h3>Edit Contact</h3>
                                    <div className="form-container">
                                        <div className="form-group">
                                            <label>Name:</label>
                                            <input
                                                type="text"
                                                value={selectedContact.name}
                                                onChange={(e) => setSelectedContact({ ...selectedContact, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Email:</label>
                                            <input
                                                type="email"
                                                value={selectedContact.email}
                                                onChange={(e) => setSelectedContact({ ...selectedContact, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Phone:</label>
                                            <input
                                                type="tel"
                                                value={selectedContact.phone}
                                                onChange={(e) => setSelectedContact({ ...selectedContact, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Hours:</label>
                                            <input
                                                type="text"
                                                value={selectedContact.hours}
                                                onChange={(e) => setSelectedContact({ ...selectedContact, hours: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Office Number:</label>
                                            <input
                                                type="text"
                                                value={selectedContact.officeNumber}
                                                onChange={(e) => setSelectedContact({ ...selectedContact, officeNumber: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Job Title:</label>
                                            <input
                                                type="text"
                                                value={selectedContact.jobTitle}
                                                onChange={(e) => setSelectedContact({ ...selectedContact, jobTitle: e.target.value })}
                                            />
                                        </div>
                                        <div className="button-group">
                                            <button
                                                onClick={saveSelectedContact}
                                                className="btn btn-success"
                                            >
                                                Save Changes
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this contact?')) {
                                                        deleteContact(selectedContact.id);
                                                        setSelectedContact(null);
                                                    }
                                                }}
                                                className="btn btn-danger"
                                            >
                                                Delete Contact
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <h3>Select a contact to edit</h3>
                                    <p>Choose a contact from the list on the left, or create a new one.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {currentTab === 'character' && (
                <div>
                    <h2>Character Settings</h2>
                    <div className="section-content">
                        <h3>Character Tones</h3>
                        {characterData.character_tones.map((tone, index) => (
                            <div key={index} className="character-tone-card">
                                <h4>Tone {index + 1}: {tone.name}</h4>
                                <div className="form-group">
                                    <label>Name:</label>
                                    <input
                                        type="text"
                                        value={tone.name}
                                        onChange={(e) => {
                                            const updated = { ...characterData };
                                            updated.character_tones[index].name = e.target.value;
                                            setCharacterData(updated);
                                        }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description:</label>
                                    <textarea
                                        value={tone.description}
                                        onChange={(e) => {
                                            const updated = { ...characterData };
                                            updated.character_tones[index].description = e.target.value;
                                            setCharacterData(updated);
                                        }}
                                        rows={3}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Principles (one per line):</label>
                                    <textarea
                                        value={tone.principles.join('\n')}
                                        onChange={(e) => {
                                            const updated = { ...characterData };
                                            updated.character_tones[index].principles = e.target.value.split('\n');
                                            setCharacterData(updated);
                                        }}
                                        rows={6}
                                    />
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={saveCharacterData}
                            className="btn btn-success"
                        >
                            Save Character Settings
                        </button>
                    </div>
                </div>
            )}

            {currentTab === 'templates' && (
                <div>
                    <h2>HTML Templates</h2>

                    <div className="split-panel">
                        {/* Template List */}
                        <div className="panel-left-narrow">
                            <div className="form-group">
                                <input
                                    type="text"
                                    value={newTemplateName}
                                    onChange={(e) => setNewTemplateName(e.target.value)}
                                    placeholder="New template name"
                                />
                                <button
                                    onClick={addNewTemplate}
                                    className="btn btn-success btn-full btn-small"
                                >
                                    + Add Template
                                </button>
                            </div>

                            <div className="template-list">
                                {Object.keys(templateData).map(templateName => (
                                    <div
                                        key={templateName}
                                        className={`template-item ${selectedTemplate === templateName ? 'template-selected' : ''}`}
                                    >
                                        <div
                                            onClick={() => setSelectedTemplate(templateName)}
                                            className="template-name"
                                        >
                                            {templateName}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteTemplate(templateName);
                                            }}
                                            className="btn-small btn-danger"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Template Editor */}
                        <div className="panel-right">
                            {selectedTemplate ? (
                                <div>
                                    <h3>Edit Template: {selectedTemplate}</h3>
                                    <textarea
                                        value={templateData[selectedTemplate] || ''}
                                        onChange={(e) => setTemplateData({ ...templateData, [selectedTemplate]: e.target.value })}
                                        className="template-editor"
                                        placeholder="Enter your HTML template here..."
                                        rows={20}
                                    />
                                    <div className="template-actions">
                                        <button
                                            onClick={saveTemplateData}
                                            className="btn btn-success"
                                        >
                                            Save All Templates
                                        </button>
                                        <small className="help-text">
                                            Use placeholders like {'{name}'}, {'{email}'}, {'{roomNumber}'} in your templates
                                        </small>
                                    </div>
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <h3>Select a template to edit</h3>
                                    <p>Choose a template from the list on the left, or create a new one.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {currentTab === 'ara' && (
                <div>
                    <h2>ARA Campus Information</h2>
                    <p>Edit the ARA campus information JSON data:</p>
                    <textarea
                        value={araData}
                        onChange={(e) => setAraData(e.target.value)}
                        className="json-editor"
                        rows={20}
                    />
                    <div className="button-group">
                        <button
                            onClick={saveAraData}
                            className="btn btn-success"
                        >
                            Save ARA Data
                        </button>
                        <button
                            onClick={() => setAraData(JSON.stringify(JSON.parse(araData), null, 2))}
                            className="btn btn-secondary"
                        >
                            Format JSON
                        </button>
                    </div>
                </div>
            )}

            {currentTab === 'computing' && (
                <div>
                    <h2>Computing Course Handbook</h2>
                    <p>This data is scraped from PDF files. Edit the raw JSON data:</p>
                    <textarea
                        value={computingData}
                        onChange={(e) => setComputingData(e.target.value)}
                        className="json-editor"
                        rows={20}
                    />
                    <div className="button-group">
                        <button
                            onClick={saveComputingData}
                            className="btn btn-success"
                        >
                            Save Computing Data
                        </button>
                        <button
                            onClick={() => setComputingData(JSON.stringify(JSON.parse(computingData), null, 2))}
                            className="btn btn-secondary"
                        >
                            Format JSON
                        </button>
                    </div>
                </div>
            )}

            {currentTab === 'student-handbook' && (
                <div>
                    <h2>Student Handbook</h2>
                    <p>This data is scraped from PDF files. Edit the raw JSON data:</p>
                    <textarea
                        value={studentHandbookData}
                        onChange={(e) => setStudentHandbookData(e.target.value)}
                        className="json-editor"
                        rows={20}
                    />
                    <div className="button-group">
                        <button
                            onClick={saveStudentHandbookData}
                            className="btn btn-success"
                        >
                            Save Student Handbook
                        </button>
                        <button
                            onClick={() => setStudentHandbookData(JSON.stringify(JSON.parse(studentHandbookData), null, 2))}
                            className="btn btn-secondary"
                        >
                            Format JSON
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Chat;
