const API_URL = '/api/auth';

const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');

window.checkAuth = () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const path = window.location.pathname;

    // Only auto-enter the dashboard when on admin routes
    if (token && user && (path === '/admin' || path.startsWith('/dashboard'))) {
        authContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        initDashboard(user);
    } else if (path === '/admin') {
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        showLogin();
    } else if (path === '/register') {
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        showPublicRegisterForm();
    } else if (path === '/track') {
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        showTrackInterface();
    } else {
        // Default: always show the public landing page at /
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        showHome();
    }
};

// Only re-run on true page-level navigation (not in-app clicks on href="#")
window.onpopstate = () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    // If user is already logged in and app is visible, don't reinitialize
    if (token && user && appContainer.style.display === 'flex') return;
    checkAuth();
};

window.showHome = () => {
    window.scrollTo(0, 0);
    authContainer.innerHTML = `
        <div id="nav-overlay" class="nav-overlay" onclick="closeNav()"></div>
        <header class="landing-header">
            <div class="landing-nav">
                <a href="/" class="landing-logo" onclick="event.preventDefault(); showHome(); history.pushState(null, '', '/');" style="text-decoration: none;">
                    <i class="fas fa-shield-alt"></i> <span>SmartCMS</span>
                </a>
                <div class="hamburger" onclick="toggleNav()">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <nav>
                    <ul class="landing-nav-links" id="landing-nav-links">
                        <li><a href="/" onclick="event.preventDefault(); showHome(); history.pushState(null, '', '/'); closeNav();">Home</a></li>
                        <li><a href="#about" onclick="closeNav()">About</a></li>
                        <li><a href="#features" onclick="closeNav()">Features</a></li>
                        <li><a href="#industries" onclick="closeNav()">Sectors</a></li>
                        <li><a href="#how-it-works" onclick="closeNav()">Workflow</a></li>
                        <li><a href="#contact" onclick="closeNav()">Contact</a></li>
                        <li><a href="/admin" class="nav-cta-btn" onclick="event.preventDefault(); showLogin(); history.pushState(null, '', '/admin'); closeNav();"><i class="fas fa-user-tie"></i> Staff Portal</a></li>
                    </ul>
                </nav>
            </div>
        </header>

        <section id="home" class="hero-section">
            <div class="hero-bg-shapes">
                <div class="shape shape-1"></div>
                <div class="shape shape-2"></div>
            </div>
            <div class="hero-container">
                <div class="hero-badge animate-fade-up">
                    <span class="badge-pill"><i class="fas fa-sparkles"></i> Transforming Complaints into Quick Solutions</span>
                </div>
                <h1 class="animate-fade-up" style="animation-delay: 0.1s;">Manage Complaints Smarter, Faster & Better</h1>
                <p class="animate-fade-up" style="animation-delay: 0.2s; max-width: 750px; margin-left: auto; margin-right: auto; line-height: 1.6; font-size: 1.15rem;">
                    SmartCMS streamlines complaint registration, tracking, assignment, and resolution in one powerful platform designed for organizations, institutions, political offices, businesses, and public service sectors.
                </p>

                <!-- Checklist -->
                <div class="animate-fade-up" style="animation-delay: 0.25s; display: flex; flex-wrap: wrap; justify-content: center; gap: 1.5rem; margin-top: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: white; font-weight: 600; background: rgba(255,255,255,0.08); padding: 0.5rem 1rem; border-radius: 2rem; border: 1px solid rgba(255,255,255,0.1);">
                        <i class="fas fa-check-circle" style="color: #10b981;"></i> Real-Time Complaint Tracking
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: white; font-weight: 600; background: rgba(255,255,255,0.08); padding: 0.5rem 1rem; border-radius: 2rem; border: 1px solid rgba(255,255,255,0.1);">
                        <i class="fas fa-check-circle" style="color: #10b981;"></i> Automated Workflow Management
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: white; font-weight: 600; background: rgba(255,255,255,0.08); padding: 0.5rem 1rem; border-radius: 2rem; border: 1px solid rgba(255,255,255,0.1);">
                        <i class="fas fa-check-circle" style="color: #10b981;"></i> User Friendly Dashboard
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: white; font-weight: 600; background: rgba(255,255,255,0.08); padding: 0.5rem 1rem; border-radius: 2rem; border: 1px solid rgba(255,255,255,0.1);">
                        <i class="fas fa-check-circle" style="color: #10b981;"></i> Analytics & Reports
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: white; font-weight: 600; background: rgba(255,255,255,0.08); padding: 0.5rem 1rem; border-radius: 2rem; border: 1px solid rgba(255,255,255,0.1);">
                        <i class="fas fa-check-circle" style="color: #10b981;"></i> Mobile Responsive System
                    </div>
                </div>
                
                <div class="landing-actions animate-fade-up hero-actions-grid" style="animation-delay: 0.3s;">
                    <button class="landing-btn" onclick="showPublicRegisterForm(); history.pushState(null, '', '/register');">
                        <div class="btn-icon-wrapper file-icon">
                            <i class="fas fa-file-signature"></i>
                        </div>
                        <div class="btn-text-wrapper">
                            <h3>Register Complaint</h3>
                            <p>File a new concern instantly without logging in</p>
                        </div>
                        <i class="fas fa-arrow-right arrow-indicator"></i>
                    </button>
                    
                    <button class="landing-btn" onclick="showTrackInterface(); history.pushState(null, '', '/track');">
                        <div class="btn-icon-wrapper track-icon">
                            <i class="fas fa-search-location"></i>
                        </div>
                        <div class="btn-text-wrapper">
                            <h3>Track Complaint</h3>
                            <p>Check the live status of your filed issue</p>
                        </div>
                        <i class="fas fa-arrow-right arrow-indicator"></i>
                    </button>
                </div>

                <!-- CTA Actions -->
                <div class="hero-cta-buttons animate-fade-up" style="animation-delay: 0.35s;">
                    <button class="btn btn-primary" onclick="openDemoModal()" style="padding: 0.85rem 2rem; font-size: 1.05rem; font-weight: 700; border-radius: 2rem; box-shadow: 0 4px 15px var(--primary-glow); display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-calendar-alt"></i> Request Demo
                    </button>
                    <button class="btn" onclick="document.getElementById('about').scrollIntoView({behavior: 'smooth'})" style="padding: 0.85rem 2rem; font-size: 1.05rem; font-weight: 700; border-radius: 2rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; display: flex; align-items: center; gap: 0.5rem; transition: var(--transition-smooth); cursor: pointer;">
                        Learn More <i class="fas fa-arrow-down"></i>
                    </button>
                </div>
            </div>
        </section>

        <!-- About Section -->
        <section id="about" class="features-section reveal" style="background: var(--background); border-bottom: 1px solid var(--border);">
            <div class="section-header">
                <span class="section-subtitle">What is SmartCMS?</span>
                <h2>Built for Efficiency & Transparency</h2>
                <div class="header-line"></div>
            </div>
            
            <div class="about-section-grid">
                <div class="reveal-left reveal" style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <p style="font-size: 1.15rem; line-height: 1.7; color: var(--text-main); font-weight: 500;">
                        SmartCMS is an advanced complaint management solution that helps organizations handle complaints efficiently from submission to resolution.
                    </p>
                    <p style="line-height: 1.7; color: var(--text-muted);">
                        Our system provides a transparent, organized, and data-driven approach to complaint handling, improving accountability, response time, and customer satisfaction.
                    </p>
                    <p style="line-height: 1.7; color: var(--text-muted);">
                        Whether it's citizen complaints, employee grievances, customer support issues, or internal service requests — SmartCMS simplifies the entire process.
                    </p>
                </div>
                <div class="reveal-right reveal" style="background: white; border: 1px solid var(--border); border-radius: 2rem; padding: 2.5rem; box-shadow: var(--shadow-soft);">
                    <h3 style="font-size: 1.3rem; font-weight: 800; margin-bottom: 1.5rem; color: var(--text-main);">Redressal Outcomes</h3>
                    <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 1rem;">
                        <li style="display: flex; align-items: center; gap: 0.75rem; font-weight: 600; color: var(--text-main);">
                            <i class="fas fa-check-circle" style="color: var(--success); font-size: 1.15rem;"></i> Faster Complaint Resolution
                        </li>
                        <li style="display: flex; align-items: center; gap: 0.75rem; font-weight: 600; color: var(--text-main);">
                            <i class="fas fa-check-circle" style="color: var(--success); font-size: 1.15rem;"></i> Improved Accountability
                        </li>
                        <li style="display: flex; align-items: center; gap: 0.75rem; font-weight: 600; color: var(--text-main);">
                            <i class="fas fa-check-circle" style="color: var(--success); font-size: 1.15rem;"></i> Centralized Data Management
                        </li>
                        <li style="display: flex; align-items: center; gap: 0.75rem; font-weight: 600; color: var(--text-main);">
                            <i class="fas fa-check-circle" style="color: var(--success); font-size: 1.15rem;"></i> Reduced Manual Work
                        </li>
                        <li style="display: flex; align-items: center; gap: 0.75rem; font-weight: 600; color: var(--text-main);">
                            <i class="fas fa-check-circle" style="color: var(--success); font-size: 1.15rem;"></i> Better Decisions with Analytics
                        </li>
                        <li style="display: flex; align-items: center; gap: 0.75rem; font-weight: 600; color: var(--text-main);">
                            <i class="fas fa-check-circle" style="color: var(--success); font-size: 1.15rem;"></i> Secure & Scalable Architecture
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        <!-- Core Features Section -->
        <section id="features" class="features-section reveal">
            <div class="section-header">
                <span class="section-subtitle">Core Features</span>
                <h2>Powerful Features Built for Modern Complaint Management</h2>
                <div class="header-line"></div>
            </div>
            
            <div class="features-grid">
                <div class="feature-card reveal-left reveal">
                    <div class="feature-icon"><i class="fas fa-file-signature"></i></div>
                    <h3>Complaint Registration</h3>
                    <p>Quickly register complaints with detailed information, attachments, categories, and priority levels.</p>
                </div>
                <div class="feature-card reveal">
                    <div class="feature-icon"><i class="fas fa-chart-pie"></i></div>
                    <h3>Smart Dashboard</h3>
                    <p>Monitor complaints, pending issues, completed tasks, and department performance from a centralized dashboard.</p>
                </div>
                <div class="feature-card reveal-right reveal">
                    <div class="feature-icon"><i class="fas fa-sync"></i></div>
                    <h3>Complaint Workflow Automation</h3>
                    <p>Automatically assign, route, and escalate complaints based on predefined workflows.</p>
                </div>
                <div class="feature-card reveal-left reveal">
                    <div class="feature-icon"><i class="fas fa-search-location"></i></div>
                    <h3>Real-Time Status Tracking</h3>
                    <p>Track complaint progress from submission to resolution with live updates.</p>
                </div>
                <div class="feature-card reveal">
                    <div class="feature-icon"><i class="fas fa-user-shield"></i></div>
                    <h3>User & Role Management</h3>
                    <p>Create Admin, Staff, Manager, Officer, and User roles with secure permission controls.</p>
                </div>
                <div class="feature-card reveal-right reveal">
                    <div class="feature-icon"><i class="fas fa-bell"></i></div>
                    <h3>Instant Notifications</h3>
                    <p>Receive alerts and updates through email, SMS, or system notifications.</p>
                </div>
                <div class="feature-card reveal-left reveal">
                    <div class="feature-icon"><i class="fas fa-file-excel"></i></div>
                    <h3>Reports & Analytics</h3>
                    <p>Generate performance reports, complaint statistics, department analytics, and resolution insights.</p>
                </div>
                <div class="feature-card reveal-right reveal">
                    <div class="feature-icon"><i class="fas fa-mobile-alt"></i></div>
                    <h3>Responsive Design</h3>
                    <p>Access SmartCMS anytime, anywhere across desktop, tablet, and mobile devices.</p>
                </div>
            </div>
        </section>

        <!-- Sectors We Serve Section -->
        <section id="industries" class="industries-section reveal" style="background: var(--background); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
            <div class="section-header">
                <span class="section-subtitle">Industries We Serve</span>
                <h2>SmartCMS Fits Multiple Sectors</h2>
                <div class="header-line"></div>
            </div>
            
            <div class="industries-grid">
                <div class="industry-card reveal-left reveal">
                    <div class="industry-icon"><i class="fas fa-university"></i></div>
                    <h3>Government Departments</h3>
                </div>
                <div class="industry-card reveal">
                    <div class="industry-icon"><i class="fas fa-bullhorn"></i></div>
                    <h3>Political Organizations</h3>
                </div>
                <div class="industry-card reveal">
                    <div class="industry-icon"><i class="fas fa-graduation-cap"></i></div>
                    <h3>Educational Institutions</h3>
                </div>
                <div class="industry-card reveal-right reveal">
                    <div class="industry-icon"><i class="fas fa-building"></i></div>
                    <h3>Corporate Enterprises</h3>
                </div>
                <div class="industry-card reveal-left reveal">
                    <div class="industry-icon"><i class="fas fa-headset"></i></div>
                    <h3>Customer Support Teams</h3>
                </div>
                <div class="industry-card reveal">
                    <div class="industry-icon"><i class="fas fa-users-cog"></i></div>
                    <h3>HR & Employee Management</h3>
                </div>
                <div class="industry-card reveal">
                    <div class="industry-icon"><i class="fas fa-city"></i></div>
                    <h3>Municipal & Public Services</h3>
                </div>
                <div class="industry-card reveal-right reveal">
                    <div class="industry-icon"><i class="fas fa-hand-holding-heart"></i></div>
                    <h3>NGOs & Service Orgs</h3>
                </div>
            </div>
        </section>

        <!-- Workflow Process Section -->
        <section id="how-it-works" class="how-it-works-section reveal">
            <div class="section-header">
                <span class="section-subtitle">Redressal Flow</span>
                <h2>How SmartCMS Works</h2>
                <div class="header-line"></div>
            </div>
            
            <div class="how-timeline">
                <div class="timeline-item reveal-left reveal">
                    <div class="timeline-number">01</div>
                    <div class="timeline-content">
                        <h3>Complaint Submission</h3>
                        <p>Users submit complaints through the system with optional file attachments.</p>
                    </div>
                </div>
                <div class="timeline-item reveal-right reveal">
                    <div class="timeline-number">02</div>
                    <div class="timeline-content">
                        <h3>Assignment & Review</h3>
                        <p>Complaints are assigned automatically or manually to responsible departments or officers.</p>
                    </div>
                </div>
                <div class="timeline-item reveal-left reveal">
                    <div class="timeline-number">03</div>
                    <div class="timeline-content">
                        <h3>Investigation & Action</h3>
                        <p>Teams analyze the issue, converse in logs, and work toward resolution.</p>
                    </div>
                </div>
                <div class="timeline-item reveal-right reveal">
                    <div class="timeline-number">04</div>
                    <div class="timeline-content">
                        <h3>Status Updates</h3>
                        <p>Progress updates are recorded and shared in real-time with the citizen.</p>
                    </div>
                </div>
                <div class="timeline-item reveal-left reveal">
                    <div class="timeline-number">05</div>
                    <div class="timeline-content">
                        <h3>Resolution & Closure</h3>
                        <p>Complaint gets resolved with proper documentation and automated report generation.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Security Section -->
        <section class="security-section reveal">
            <div class="security-container">
                <div class="security-text reveal-left reveal">
                    <span class="section-subtitle" style="color: #818cf8;">Security & Reliability</span>
                    <h2>Enterprise-Level Security</h2>
                    <p>Your data security matters. We design our platforms with standard security mechanisms to guarantee data protection, privacy, and full accountability.</p>
                </div>
                <div class="security-grid reveal-right reveal">
                    <div class="security-card">
                        <div class="security-icon"><i class="fas fa-lock"></i></div>
                        <div>
                            <h3>Secure Authentication</h3>
                        </div>
                    </div>
                    <div class="security-card">
                        <div class="security-icon"><i class="fas fa-user-shield"></i></div>
                        <div>
                            <h3>Role-Based Access Control</h3>
                        </div>
                    </div>
                    <div class="security-card">
                        <div class="security-icon"><i class="fas fa-shield-alt"></i></div>
                        <div>
                            <h3>Data Protection & Safety</h3>
                        </div>
                    </div>
                    <div class="security-card">
                        <div class="security-icon"><i class="fas fa-history"></i></div>
                        <div>
                            <h3>Activity Logs & Audit Trail</h3>
                        </div>
                    </div>
                    <div class="security-card">
                        <div class="security-icon"><i class="fas fa-server"></i></div>
                        <div>
                            <h3>Cloud-Ready & Scalable</h3>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Benefits Section -->
        <section class="benefits-section reveal">
            <div class="section-header">
                <span class="section-subtitle">Grievance redressing outcomes</span>
                <h2>Drive Better Complaint Resolution Outcomes</h2>
                <div class="header-line"></div>
                <p style="max-width: 600px; margin: 1rem auto 0; color: var(--text-muted);">
                    Increase transparency, improve communication, and build trust with a smarter complaint management approach.
                </p>
            </div>
            
            <div class="benefits-grid">
                <div class="benefit-card reveal-left reveal">
                    <span class="benefit-number">01</span>
                    <h3>Faster Operations</h3>
                </div>
                <div class="benefit-card reveal">
                    <span class="benefit-number">02</span>
                    <h3>Higher Productivity</h3>
                </div>
                <div class="benefit-card reveal">
                    <span class="benefit-number">03</span>
                    <h3>Improved Service Quality</h3>
                </div>
                <div class="benefit-card reveal">
                    <span class="benefit-number">04</span>
                    <h3>Data-Driven Decisions</h3>
                </div>
                <div class="benefit-card reveal-right reveal">
                    <span class="benefit-number">05</span>
                    <h3>Better User Satisfaction</h3>
                </div>
            </div>
        </section>

        <!-- Contact Section -->
        <section id="contact" class="contact-section reveal">
            <div class="contact-card-wrapper">
                <span class="section-subtitle">Get In Touch</span>
                <h2>Ready to Modernize Complaint Management?</h2>
                <p style="max-width: 600px; margin: 1rem auto 0; color: var(--text-muted);">
                    Take control of your complaint handling process with SmartCMS. Book a session with us.
                </p>
                
                <div class="contact-info-grid">
                    <div class="contact-item">
                        <i class="fas fa-envelope"></i>
                        <h4>Email Us</h4>
                        <p>info@smartcms.com</p>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-phone-alt"></i>
                        <h4>Call Us</h4>
                        <p>+91 XXXXX XXXXX</p>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <h4>Location</h4>
                        <p>Tamil Nadu, India</p>
                    </div>
                </div>

                <button class="btn btn-primary" onclick="openDemoModal()" style="padding: 1rem 3rem; font-size: 1.1rem; font-weight: 700; border-radius: 2rem;">
                    Schedule Demo
                </button>
            </div>
        </section>

        <!-- Footer -->
        <footer style="text-align: center; padding: 4rem 2rem; background: var(--sidebar); color: #94a3b8; font-size: 0.95rem; border-top: 1px solid var(--border);">
            <div style="margin-bottom: 2rem;">
                <h3 style="color: white; font-weight: 800; margin-bottom: 0.5rem;">SMARTCMS</h3>
                <p style="color: #64748b; font-size: 0.9rem; max-width: 300px; margin: 0 auto;">Simplifying Complaint Management with Technology.</p>
            </div>
            <div style="margin-bottom: 2rem; display: flex; justify-content: center; gap: 2rem;">
                <a href="#about" style="color: #94a3b8; text-decoration: none; font-weight: 500;">About</a>
                <a href="#features" style="color: #94a3b8; text-decoration: none; font-weight: 500;">Features</a>
                <a href="#industries" style="color: #94a3b8; text-decoration: none; font-weight: 500;">Sectors</a>
                <a href="#how-it-works" style="color: #94a3b8; text-decoration: none; font-weight: 500;">Workflow</a>
                <a href="#contact" style="color: #94a3b8; text-decoration: none; font-weight: 500;">Contact</a>
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 2rem; color: #64748b;">
                &copy; 2026 SmartCMS. All Rights Reserved.
            </div>
        </footer>

        <!-- Demo Booking Modal Overlay -->
        <div class="modal-overlay" id="demo-modal" onclick="if(event.target === this) closeDemoModal()">
            <div class="modal-container">
                <button class="modal-close" onclick="closeDemoModal()"><i class="fas fa-times"></i></button>
                
                <!-- Form View -->
                <div id="demo-form-wrapper">
                    <div class="modal-header">
                        <i class="fas fa-calendar-check"></i>
                        <h3>Schedule a Demo</h3>
                        <p>Experience the power of SmartCMS firsthand</p>
                    </div>
                    <form id="demo-form" onsubmit="submitDemoRequest(event)">
                        <div class="modal-body" style="margin-top: 0;">
                            <div class="form-group" style="text-align: left; margin-bottom: 1.25rem;">
                                <label class="form-label" style="font-weight: 600; margin-bottom: 0.5rem; display: block; font-size: 0.9rem;">Full Name</label>
                                <input type="text" class="form-input" required id="demo-name" placeholder="John Doe">
                            </div>
                            <div class="form-group" style="text-align: left; margin-bottom: 1.25rem;">
                                <label class="form-label" style="font-weight: 600; margin-bottom: 0.5rem; display: block; font-size: 0.9rem;">Work Email</label>
                                <input type="email" class="form-input" required id="demo-email" placeholder="john@organization.com">
                            </div>
                            <div class="form-group" style="text-align: left; margin-bottom: 1.25rem;">
                                <label class="form-label" style="font-weight: 600; margin-bottom: 0.5rem; display: block; font-size: 0.9rem;">Organization Name</label>
                                <input type="text" class="form-input" required id="demo-org" placeholder="Acme Corp">
                            </div>
                            <div class="form-group" style="text-align: left; margin-bottom: 1.5rem;">
                                <label class="form-label" style="font-weight: 600; margin-bottom: 0.5rem; display: block; font-size: 0.9rem;">Phone Number</label>
                                <input type="tel" class="form-input" required id="demo-phone" placeholder="+91 XXXXX XXXXX">
                            </div>
                            <button type="submit" class="modal-btn" style="width: 100%;">Request Demo Session</button>
                        </div>
                    </form>
                </div>

                <!-- Success View -->
                <div id="demo-success-wrapper" style="display: none; text-align: center; padding: 1.5rem 0;">
                    <div style="width: 72px; height: 72px; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 1.5rem;">
                        <i class="fas fa-check"></i>
                    </div>
                    <h3 style="font-size: 1.5rem; font-weight: 900; margin-bottom: 0.5rem; color: var(--text-main);">Demo Scheduled!</h3>
                    <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
                        Thank you <strong id="success-name"></strong>. We've sent a calendar invitation and confirmation details to <strong id="success-email"></strong> for <strong id="success-org"></strong>.
                    </p>
                    <button class="modal-btn" onclick="closeDemoModal()" style="width: 100%;">Done</button>
                </div>
            </div>
        </div>
    `;
    setupScrollAnimations();
};

window.openDemoModal = () => {
    const formWrapper = document.getElementById('demo-form-wrapper');
    const successWrapper = document.getElementById('demo-success-wrapper');
    if (formWrapper && successWrapper) {
        formWrapper.style.display = 'block';
        successWrapper.style.display = 'none';
        document.getElementById('demo-form').reset();
    }
    document.getElementById('demo-modal').classList.add('active');
};

window.closeDemoModal = () => {
    document.getElementById('demo-modal').classList.remove('active');
};

window.submitDemoRequest = (event) => {
    event.preventDefault();
    const name = document.getElementById('demo-name').value;
    const email = document.getElementById('demo-email').value;
    const org = document.getElementById('demo-org').value;
    
    document.getElementById('success-name').textContent = name;
    document.getElementById('success-email').textContent = email;
    document.getElementById('success-org').textContent = org;
    
    const formWrapper = document.getElementById('demo-form-wrapper');
    const successWrapper = document.getElementById('demo-success-wrapper');
    if (formWrapper && successWrapper) {
        formWrapper.style.display = 'none';
        successWrapper.style.display = 'block';
    }
};

window.toggleNav = () => {
    const nav = document.getElementById('landing-nav-links');
    const burger = document.querySelector('.hamburger');
    const overlay = document.getElementById('nav-overlay');
    nav.classList.toggle('active');
    burger.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
};

window.closeNav = () => {
    const nav = document.getElementById('landing-nav-links');
    const burger = document.querySelector('.hamburger');
    const overlay = document.getElementById('nav-overlay');
    nav.classList.remove('active');
    burger.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
};

window.setupScrollAnimations = () => {
    // 1. Staggered reveal animations for grid children
    const grids = document.querySelectorAll('.features-grid, .industries-grid, .benefits-grid, .why-choose-list');
    grids.forEach(grid => {
        const reveals = grid.querySelectorAll('.reveal, .reveal-left, .reveal-right');
        reveals.forEach((el, index) => {
            el.style.transitionDelay = `${(index % 4) * 0.08}s`;
        });
    });

    // 2. IntersectionObserver for scroll-up & scroll-down reveal logic
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            } else {
                // Remove active class when scrolling out of view to trigger it again
                entry.target.classList.remove('active');
            }
        });
    }, { 
        threshold: 0.02, 
        rootMargin: "0px 0px -40px 0px"
    });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
        observer.observe(el);
    });

    // 3. Global Scroll Handler: Progress bar and dynamic header scrolled state
    if (window.landingScrollHandler) {
        window.removeEventListener('scroll', window.landingScrollHandler);
    }

    window.landingScrollHandler = () => {
        // Update header scrolled state
        const header = document.querySelector('.landing-header');
        if (header) {
            if (window.scrollY > 40) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }

        // Update progress bar
        const progressBar = document.getElementById('scroll-progress');
        if (progressBar) {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (totalHeight > 0) {
                const progress = (window.scrollY / totalHeight) * 100;
                progressBar.style.width = `${progress}%`;
            } else {
                progressBar.style.width = '0%';
            }
        }
    };

    window.addEventListener('scroll', window.landingScrollHandler);
    // Initial call to set correct states on render
    window.landingScrollHandler();
};

window.showLogin = () => {
    window.scrollTo(0, 0);
    authContainer.innerHTML = `
        <div class="auth-page">
            <div class="auth-card">
                <div style="margin-bottom: 1.5rem;">
                    <a href="/" onclick="event.preventDefault(); showHome(); history.pushState(null, '', '/');" style="color: var(--text-muted); text-decoration: none; font-size: 0.9rem;">
                        <i class="fas fa-arrow-left"></i> Back to Home
                    </a>
                </div>
                <h2 style="margin-bottom: 2rem; text-align: center;">Staff Login</h2>
                <form id="login-form">
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" class="form-input" id="login-email" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" class="form-input" id="login-password" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Sign In</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data));
                checkAuth();
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    });
};

window.showRegister = () => {
    window.scrollTo(0, 0);
    authContainer.innerHTML = `
        <div class="auth-page">
            <div class="auth-card">
                <h2 style="margin-bottom: 2rem; text-align: center;">Create Account</h2>
                <form id="register-form">
                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" class="form-input" id="reg-name" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" class="form-input" id="reg-email" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" class="form-input" id="reg-password" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Register</button>
                    <p style="text-align: center; margin-top: 1.5rem; color: var(--text-muted);">
                        Already have an account? <a href="#" onclick="showLogin()" style="color: var(--primary); font-weight: 600;">Sign In</a>
                    </p>
                </form>
            </div>
        </div>
    `;

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data));
                checkAuth();
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    });
};

window.logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    location.reload();
};

document.addEventListener('DOMContentLoaded', checkAuth);
