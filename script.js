// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('JavaScript is loaded and running!');
});

class BookTracker {
    constructor() {
        this.books = [];
        this.form = document.getElementById('bookForm');
        this.bookList = document.getElementById('bookList');
        this.sortSelect = document.getElementById('sortBooks');
        this.searchInput = document.getElementById('searchBooks');
        
        this.initializeEventListeners();
        this.loadBooksFromFirebase();
    }

    async loadBooksFromFirebase() {
        try {
            const snapshot = await db.collection('books').get();
            this.books = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            this.renderBooks();
        } catch (error) {
            this.showError('Error loading books');
        }
    }

    async addBook(bookData) {
        try {
            const docRef = await db.collection('books').add({
                ...bookData,
                addedDate: new Date().toISOString(),
                isRead: false
            });
            
            const book = {
                id: docRef.id,
                ...bookData,
                addedDate: new Date().toISOString(),
                isRead: false
            };
            
            this.books.push(book);
            this.renderBooks();
        } catch (error) {
            this.showError('Error adding book');
        }
    }

    async toggleReadStatus(id) {
        try {
            const book = this.books.find(book => book.id === id);
            if (book) {
                book.isRead = !book.isRead;
                await db.collection('books').doc(id).update({
                    isRead: book.isRead
                });
                this.renderBooks();
            }
        } catch (error) {
            this.showError('Error updating book status');
        }
    }

    async deleteBook(id) {
        try {
            await db.collection('books').doc(id).delete();
            this.books = this.books.filter(book => book.id !== id);
            this.renderBooks();
        } catch (error) {
            this.showError('Error deleting book');
        }
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.sortSelect.addEventListener('change', () => this.renderBooks());
        this.searchInput.addEventListener('input', () => this.renderBooks());
    }

    async handleSubmit(e) {
        e.preventDefault();
        const title = document.getElementById('bookTitle').value;
        const submitButton = this.form.querySelector('button');
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = 'Searching...';
            
            const books = await this.searchBooks(title);
            if (books.length > 1) {
                this.showBookSelection(books);
            } else if (books.length === 1) {
                this.addBook(books[0]);
            }
            this.form.reset();
        } catch (error) {
            this.showError(error.message);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Add Book';
        }
    }

    async searchBooks(title) {
        console.log('Searching for:', title);
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=5`
        );

        if (!response.ok) {
            console.error('API response not ok:', response.status);
            throw new Error('Failed to fetch book data');
        }

        const data = await response.json();
        console.log('API response:', data);
        
        if (!data.items || data.items.length === 0) {
            throw new Error('No books found with that title');
        }

        const books = data.items.map(item => ({
            title: item.volumeInfo.title,
            author: item.volumeInfo.authors?.[0] || 'Unknown Author',
            subject: item.volumeInfo.categories?.[0] || 'Uncategorized',
            coverUrl: item.volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/200x300?text=No+Cover',
            description: item.volumeInfo.description || 'No description available'
        }));
        
        console.log('Processed books:', books);
        return books;
    }

    showBookSelection(books) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
                <h2>Select a Book</h2>
                <div class="book-selection">
                    ${books.map((book, index) => `
                        <div class="book-option" onclick="bookTracker.selectBook(${index})">
                            <img src="${book.coverUrl}" alt="${book.title} cover">
                            <div class="book-details">
                                <h3>${book.title}</h3>
                                <p>By: ${book.author}</p>
                                <p class="description">${book.description.substring(0, 150)}...</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button onclick="this.closest('.modal').remove()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
        this._currentSearchResults = books;
    }

    selectBook(index) {
        const book = this._currentSearchResults[index];
        this.addBook(book);
        document.querySelector('.modal').remove();
    }

    async saveToLocalStorage() {
        try {
            await db.collection('books').add({
                books: JSON.stringify(this.books)
            });
        } catch (error) {
            this.showError('Error saving books');
        }
    }

    sortBooks() {
        const sortBy = this.sortSelect.value;
        return [...this.books].sort((a, b) => {
            if (sortBy === 'addedDate') {
                return new Date(b.addedDate) - new Date(a.addedDate);
            }
            return a[sortBy].localeCompare(b[sortBy]);
        });
    }

    filterBooks(books) {
        const searchTerm = this.searchInput.value.toLowerCase();
        if (!searchTerm) return books;

        return books.filter(book => 
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm) ||
            book.subject.toLowerCase().includes(searchTerm)
        );
    }

    renderBooks() {
        let displayBooks = this.sortBooks();
        displayBooks = this.filterBooks(displayBooks);
        
        this.bookList.innerHTML = displayBooks.map(book => `
            <div class="book-card ${book.isRead ? 'read' : ''}">
                <button 
                    class="delete-btn" 
                    onclick="bookTracker.deleteBook(${book.id})"
                    title="Delete book"
                >×</button>
                <img src="${book.coverUrl}" alt="${book.title} cover">
                <div class="editable" 
                     onclick="bookTracker.makeEditable(this)" 
                     data-field="title" 
                     data-id="${book.id}">
                    <h3>${book.title}</h3>
                </div>
                <div class="editable" 
                     onclick="bookTracker.makeEditable(this)" 
                     data-field="author" 
                     data-id="${book.id}">
                    <p>By: ${book.author}</p>
                </div>
                <div class="editable" 
                     onclick="bookTracker.makeEditable(this)" 
                     data-field="subject" 
                     data-id="${book.id}">
                    <p>Subject: ${book.subject}</p>
                </div>
                <p class="added-date">Added: ${this.formatDate(book.addedDate)}</p>
                <button 
                    class="view-details-btn"
                    onclick="bookTracker.showBookDetails(${book.id})"
                >View Details</button>
                <label class="book-status">
                    <input type="checkbox" 
                           ${book.isRead ? 'checked' : ''} 
                           onchange="bookTracker.toggleReadStatus(${book.id})">
                    Finished
                </label>
            </div>
        `).join('');

        if (displayBooks.length === 0) {
            this.bookList.innerHTML = `
                <div class="no-results">
                    No books found matching your search.
                </div>`;
        }
    }

    showError(message) {
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = message;
        this.form.appendChild(error);

        setTimeout(() => error.remove(), 5000);
    }

    showBookDetails(id) {
        const book = this.books.find(book => book.id === id);
        if (!book) {
            console.error('Book not found:', id);
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content book-details-modal">
                <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
                <div class="book-header">
                    <img src="${book.coverUrl}" alt="${book.title} cover">
                    <div>
                        <h2>${book.title}</h2>
                        <p class="author">By: ${book.author}</p>
                        <p class="subject">Subject: ${book.subject}</p>
                        <div class="rating-container">
                            ${this.generateRatingStars(book.rating || 0)}
                        </div>
                    </div>
                </div>
                <div class="book-body">
                    <h3>Description</h3>
                    <p>${book.description || 'No description available'}</p>
                    <div class="review-section">
                        <h3>Your Review</h3>
                        <textarea
                            id="reviewText"
                            placeholder="Write your review here..."
                        >${book.review || ''}</textarea>
                    </div>
                </div>
                <div class="modal-actions">
                    <button onclick="bookTracker.saveBookDetails('${id}')">Save</button>
                    <button onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Set up rating functionality
        const stars = modal.querySelectorAll('.star');
        stars.forEach((star, index) => {
            star.addEventListener('click', () => this.setRating(stars, index + 1));
        });
    }

    generateRatingStars(rating) {
        return `
            <div class="stars">
                ${Array.from({ length: 5 }, (_, i) => `
                    <span class="star ${i < rating ? 'filled' : ''}" data-rating="${i + 1}">★</span>
                `).join('')}
            </div>
        `;
    }

    setRating(stars, rating) {
        stars.forEach((star, index) => {
            star.classList.toggle('filled', index < rating);
        });
    }

    async saveBookDetails(id) {
        const book = this.books.find(book => book.id === id);
        if (!book) return;

        const modal = document.querySelector('.modal');
        const rating = modal.querySelectorAll('.star.filled').length;
        const review = modal.querySelector('#reviewText').value;

        try {
            // Update Firebase first
            await db.collection('books').doc(id).update({
                rating: rating,
                review: review
            });
            
            // Then update local state
            book.rating = rating;
            book.review = review;
            this.renderBooks();
            modal.remove();
        } catch (error) {
            console.error('Error saving book details:', error);
            this.showError('Error saving book details');
        }
    }

    makeEditable(element) {
        const field = element.dataset.field;
        const id = element.dataset.id;
        const book = this.books.find(b => b.id === id);
        
        if (!book) {
            console.error('Book not found:', id);
            return;
        }

        let currentValue = book[field];
        if (field === 'author') {
            currentValue = book[field].replace('By: ', '');
        } else if (field === 'subject') {
            currentValue = book[field].replace('Subject: ', '');
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'inline-edit';
        
        // Save on enter key
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.saveEdit(id, field, input.value);
                input.blur();
            }
            // Cancel on escape key
            if (e.key === 'Escape') {
                this.renderBooks();
            }
        });

        // Save on blur (when clicking away)
        input.addEventListener('blur', () => {
            this.saveEdit(id, field, input.value);
        });

        // Clear the element and add the input
        element.innerHTML = '';
        element.appendChild(input);
        input.focus();
        input.select();
    }

    async saveEdit(id, field, value) {
        try {
            // First update Firebase
            await db.collection('books').doc(id).update({
                [field]: value
            });
            
            // Then update local state
            const book = this.books.find(b => b.id === id);
            if (book) {
                book[field] = value;
                this.renderBooks();
            }
        } catch (error) {
            console.error('Error saving edit:', error);
            this.showError('Error saving changes');
            this.renderBooks(); // Revert changes on error
        }
    }

    formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
}

const bookTracker = new BookTracker();