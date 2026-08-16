-- ============ CATALOGUE TABLES ============
CREATE TABLE public.store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  description text,
  icon text,
  position integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_categories TO authenticated;
GRANT ALL ON public.store_categories TO service_role;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published categories are public" ON public.store_categories FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage categories" ON public.store_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_store_categories_updated_at BEFORE UPDATE ON public.store_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.store_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  icon text,
  category_slug text,
  position integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_problems TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_problems TO authenticated;
GRANT ALL ON public.store_problems TO service_role;
ALTER TABLE public.store_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published problems are public" ON public.store_problems FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage problems" ON public.store_problems FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_store_problems_updated_at BEFORE UPDATE ON public.store_problems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category_slug text NOT NULL,
  level text NOT NULL DEFAULT 'business',
  badge text,
  outcome text NOT NULL,
  summary text,
  problem_statement text,
  deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
  best_for jsonb NOT NULL DEFAULT '[]'::jsonb,
  integrations jsonb NOT NULL DEFAULT '[]'::jsonb,
  industries jsonb NOT NULL DEFAULT '[]'::jsonb,
  workflow jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  problem_slugs jsonb NOT NULL DEFAULT '[]'::jsonb,
  config_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  base_price_pence integer NOT NULL DEFAULT 0,
  delivery_estimate text,
  delivery_days integer,
  is_popular boolean NOT NULL DEFAULT false,
  managed_support boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_products TO authenticated;
GRANT ALL ON public.store_products TO service_role;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published products are public" ON public.store_products FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage products" ON public.store_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_store_products_updated_at BEFORE UPDATE ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_store_products_category ON public.store_products (category_slug);

CREATE TABLE public.store_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  best_for text,
  includes jsonb NOT NULL DEFAULT '[]'::jsonb,
  product_slugs jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_pence integer NOT NULL DEFAULT 0,
  saving_pence integer NOT NULL DEFAULT 0,
  badge text,
  delivery_estimate text,
  position integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_bundles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_bundles TO authenticated;
GRANT ALL ON public.store_bundles TO service_role;
ALTER TABLE public.store_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published bundles are public" ON public.store_bundles FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage bundles" ON public.store_bundles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_store_bundles_updated_at BEFORE UPDATE ON public.store_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.store_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_pence integer NOT NULL DEFAULT 0,
  price_prefix text,
  billing_interval text NOT NULL DEFAULT 'month',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  position integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_plans TO authenticated;
GRANT ALL ON public.store_plans TO service_role;
ALTER TABLE public.store_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published plans are public" ON public.store_plans FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage plans" ON public.store_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_store_plans_updated_at BEFORE UPDATE ON public.store_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.store_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL DEFAULT 'configuration',
  product_slug text,
  bundle_slug text,
  plan_slug text,
  full_name text,
  email text,
  phone text,
  business_name text,
  website text,
  industry text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  message text,
  estimated_price_pence integer,
  currency text NOT NULL DEFAULT 'GBP',
  status text NOT NULL DEFAULT 'new',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.store_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_requests TO authenticated;
GRANT ALL ON public.store_requests TO service_role;
ALTER TABLE public.store_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a store request" ON public.store_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read store requests" ON public.store_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update store requests" ON public.store_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete store requests" ON public.store_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_store_requests_updated_at BEFORE UPDATE ON public.store_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED: CATEGORIES ============
INSERT INTO public.store_categories (slug, name, tagline, description, icon, position) VALUES
('lead-generation','Lead Generation','Never let an enquiry go cold','Capture every enquiry from every channel and put the next action on autopilot.','Magnet',1),
('sales','Sales','Follow up without chasing','Keep prospects moving through your pipeline with automatic follow-up and alerts.','TrendingUp',2),
('marketing','Marketing','Nurture at scale','Send the right message at the right moment, automatically.','Megaphone',3),
('crm','CRM','One tidy source of truth','Get every lead and customer into your CRM with clean, consistent data.','Database',4),
('whatsapp','WhatsApp','Reply where customers are','Acknowledge, qualify and follow up on WhatsApp without lifting a finger.','MessageCircle',5),
('customer-service','Customer Service','Answer faster, every time','Handle repetitive enquiries automatically and escalate the rest.','Headphones',6),
('appointments','Appointments','Fill the diary, cut no-shows','Automate booking, confirmations, reminders and recovery.','CalendarCheck',7),
('payments','Payments','Get paid on time','Automate payment reminders and post-payment workflows.','CreditCard',8),
('operations','Operations','Remove the busywork','Connect the systems your business already runs on.','Settings2',9),
('customer-onboarding','Customer Onboarding','Start every customer well','Turn a payment into a structured, repeatable onboarding journey.','UserPlus',10),
('ai','AI Assistants','Always-on intelligence','Add AI that answers questions, qualifies visitors and captures leads.','Sparkles',11),
('ecommerce','Ecommerce','Sell and support automatically','Automate order, delivery and customer messaging for online stores.','ShoppingBag',12),
('reporting','Reporting','See what is working','Automatic reports and dashboards delivered to your inbox.','BarChart3',13),
('reviews','Reviews','Build your reputation','Ask happy customers for reviews at exactly the right moment.','Star',14);

-- ============ SEED: PROBLEMS ============
INSERT INTO public.store_problems (slug, title, description, icon, category_slug, position) VALUES
('follow-up-leads-instantly','Follow Up Leads Instantly','Respond automatically when a new prospect submits an enquiry.','Zap','lead-generation',1),
('stop-losing-leads','Stop Losing Leads','Capture and organise every lead automatically.','ShieldCheck','crm',2),
('automate-appointment-booking','Automate Appointment Booking','Handle booking confirmations, reminders and follow-ups automatically.','CalendarCheck','appointments',3),
('reduce-missed-appointments','Reduce Missed Appointments','Automatically remind and reconnect with customers.','BellRing','appointments',4),
('automate-customer-onboarding','Automate Customer Onboarding','Turn a successful payment into a structured onboarding journey.','UserPlus','customer-onboarding',5),
('collect-more-reviews','Collect More Customer Reviews','Ask satisfied customers for reviews at the right time.','Star','reviews',6),
('automate-sales-follow-up','Automate Sales Follow-Up','Keep prospects engaged without manually chasing every lead.','TrendingUp','sales',7),
('automate-payment-reminders','Automate Payment Reminders','Automatically follow up on upcoming and overdue invoices.','CreditCard',  'payments',8),
('improve-customer-support','Improve Customer Support','Use AI and automation to handle repetitive enquiries.','Headphones','customer-service',9),
('connect-my-business-apps','Connect My Business Apps','Move data automatically between the platforms your business uses.','Workflow','operations',10);

-- ============ SEED: PRODUCTS ============
INSERT INTO public.store_products
(slug,name,category_slug,level,badge,outcome,summary,problem_statement,deliverables,best_for,integrations,industries,workflow,tags,problem_slugs,base_price_pence,delivery_estimate,delivery_days,is_popular,position) VALUES
('instant-lead-follow-up-automation','Instant Lead Follow-Up Automation','lead-generation','business','Best Seller',
 'Every new enquiry is captured, your team is alerted and follow-up starts immediately.',
 'Automatically capture new leads, alert your team and begin follow-up immediately.',
 'New leads lose interest quickly when nobody follows up. This automation makes sure every enquiry is captured and the next action happens immediately, day or night.',
 '["Lead source integration","CRM connection","Lead field mapping","Internal team notification","Automatic customer response","Follow-up sequence","End-to-end testing","Go-live support","Basic documentation"]',
 '["Agencies","Consultants","Estate Agents","Recruiters","Professional Services","Small Sales Teams"]',
 '["Website","Meta","Google Ads","LinkedIn","HubSpot","Gmail","Outlook","WhatsApp","Google Sheets"]',
 '["Professional Services","Property","Recruitment","Marketing"]',
 '["Lead captured","CRM record created","Sales notification","Email acknowledgement","Follow-up sequence"]',
 '["lead follow up","speed to lead","new enquiry","instant response"]',
 '["follow-up-leads-instantly","stop-losing-leads"]',
 29900,'3-5 working days',5,true,1),

('lead-to-crm-automation','Lead-to-CRM Automation','crm','quick','Quick Win',
 'Leads from every channel land in your CRM automatically, correctly mapped.',
 'Automatically send leads from websites, landing pages and advertising platforms into your CRM.',
 'Leads scattered across inboxes, ad platforms and spreadsheets get missed. This automation puts every lead into one place with consistent, usable data.',
 '["Lead source connection","CRM connection","Field mapping","Duplicate handling","Source tracking","Testing","Go-live support"]',
 '["Agencies","Local Businesses","Consultants","Small Sales Teams"]',
 '["HubSpot","Zoho","Salesforce","GoHighLevel","Airtable","Google Sheets","Meta","Google Ads","LinkedIn"]',
 '["Professional Services","Retail","Property"]',
 '["Lead submitted","Data cleaned","CRM record created","Owner assigned"]',
 '["crm","lead routing","data entry","integration"]',
 '["stop-losing-leads","connect-my-business-apps"]',
 19900,'2-4 working days',4,true,2),

('whatsapp-lead-follow-up-system','WhatsApp Lead Follow-Up System','whatsapp','business','Popular',
 'New enquiries get an instant WhatsApp reply, qualification and follow-up.',
 'Automatically acknowledge, qualify and follow up with new enquiries on WhatsApp.',
 'Customers expect a reply on WhatsApp within minutes. This automation answers instantly, asks the right qualifying questions and keeps the conversation alive until someone is ready to talk.',
 '["WhatsApp Business connection","Approved message templates","Instant acknowledgement","Qualification questions","Follow-up sequence","Handover to your team","Testing","Go-live support"]',
 '["Local Businesses","Clinics","Coaches","Estate Agents","Professional Services"]',
 '["WhatsApp","HubSpot","GoHighLevel","Google Sheets","Meta"]',
 '["Health","Property","Coaching","Retail"]',
 '["Enquiry received","Instant WhatsApp reply","Qualification questions","CRM updated","Team handover"]',
 '["whatsapp","messaging","qualification","instant reply"]',
 '["follow-up-leads-instantly","improve-customer-support"]',
 34900,'4-7 working days',7,true,3),

('appointment-booking-automation','Appointment Booking Automation','appointments','business','Popular',
 'Bookings, confirmations, reminders and follow-up run without admin time.',
 'Automate bookings, confirmations, reminders and customer follow-up.',
 'Booking by phone and email eats hours every week and still leads to double bookings. This automation gives customers a clean way to book and handles everything that happens afterwards.',
 '["Booking page setup","Calendar connection","Confirmation messages","Reminder schedule","Post-appointment follow-up","CRM record creation","Testing","Go-live support"]',
 '["Clinics","Coaches","Consultants","Local Businesses","Professional Services"]',
 '["Calendly","Google Calendar","Outlook","WhatsApp","Gmail","Stripe"]',
 '["Health","Coaching","Professional Services","Beauty"]',
 '["Customer books","Calendar updated","Confirmation sent","Reminders scheduled","Follow-up after appointment"]',
 '["appointments","booking","reminders","calendar"]',
 '["automate-appointment-booking","reduce-missed-appointments"]',
 24900,'3-5 working days',5,true,4),

('no-show-recovery-automation','No-Show Recovery Automation','appointments','quick','Quick Win',
 'Missed appointments are chased and rebooked automatically.',
 'Automatically reconnect with customers who miss their appointments.',
 'A no-show is usually a lost customer simply because nobody followed up. This automation reaches out straight away and offers an easy way to rebook.',
 '["No-show detection","Immediate follow-up message","Rebooking link","Escalation to your team","CRM status update","Testing","Go-live support"]',
 '["Clinics","Coaches","Local Businesses","Professional Services"]',
 '["Google Calendar","Calendly","WhatsApp","Gmail","Outlook"]',
 '["Health","Coaching","Beauty"]',
 '["Appointment missed","Automatic follow-up","Rebooking offered","CRM updated"]',
 '["no show","rebooking","appointment recovery"]',
 '["reduce-missed-appointments"]',
 19900,'2-4 working days',4,false,5),

('customer-review-automation','Customer Review Automation','reviews','quick','Quick Win',
 'Happy customers are asked for a review at exactly the right moment.',
 'Automatically request customer reviews following successful service delivery or purchases.',
 'Most businesses only ask for reviews when they remember. This automation asks every satisfied customer at the right moment and routes unhappy feedback to you privately first.',
 '["Trigger setup","Review request messaging","Timing rules","Private feedback routing","Reminder message","Testing","Go-live support"]',
 '["Local Businesses","Clinics","Ecommerce","Professional Services"]',
 '["Google Calendar","Stripe","Shopify","WooCommerce","WhatsApp","Gmail"]',
 '["Retail","Health","Hospitality","Professional Services"]',
 '["Service completed","Wait period","Review request sent","Feedback routed"]',
 '["reviews","reputation","feedback","google reviews"]',
 '["collect-more-reviews"]',
 14900,'2-3 working days',3,false,6),

('invoice-payment-reminder-automation','Invoice & Payment Reminder Automation','payments','quick','Quick Win',
 'Upcoming and overdue payments are chased politely and automatically.',
 'Automatically remind customers about upcoming and overdue payments.',
 'Chasing payments is uncomfortable and easy to postpone, so cash sits unpaid. This automation sends consistent, professional reminders on a schedule you decide.',
 '["Payment system connection","Reminder schedule","Pre-due and overdue messaging","Escalation rules","Payment confirmation message","Testing","Go-live support"]',
 '["Agencies","Consultants","Professional Services","Local Businesses"]',
 '["Stripe","Xero","Zoho","Gmail","Outlook","WhatsApp"]',
 '["Professional Services","Construction","Marketing"]',
 '["Invoice issued","Pre-due reminder","Due-date reminder","Overdue follow-up","Payment confirmed"]',
 '["invoices","payments","cash flow","reminders"]',
 '["automate-payment-reminders"]',
 24900,'3-5 working days',5,false,7),

('customer-onboarding-automation','Customer Onboarding Automation','operations','business','Recommended',
 'New customers move from payment to fully onboarded without manual chasing.',
 'Automatically move new customers from payment through onboarding and activation.',
 'A great sale followed by a messy start damages trust. This automation gives every new customer the same structured, professional beginning.',
 '["Payment trigger","Welcome sequence","Information collection form","Internal task creation","Progress tracking","Kick-off scheduling","Testing","Go-live support"]',
 '["Agencies","Consultants","Professional Services","Coaches"]',
 '["Stripe","HubSpot","Gmail","Outlook","Google Sheets","Airtable","Calendly"]',
 '["Marketing","Professional Services","Coaching"]',
 '["Payment received","Welcome message","Onboarding form","Internal tasks created","Kick-off booked"]',
 '["onboarding","activation","welcome","handover"]',
 '["automate-customer-onboarding"]',
 39900,'5-8 working days',8,false,8),

('ai-website-assistant','AI Website Assistant','ai','business','Recommended',
 'An AI assistant answers visitor questions and captures qualified leads 24/7.',
 'Add an AI assistant that answers questions, qualifies visitors and captures leads.',
 'Most website visitors leave without asking a question. This assistant answers instantly using your own business information and captures the details of anyone worth following up.',
 '["Assistant setup","Trained on your business content","Lead capture","Qualification questions","Human handover","CRM connection","Testing","Go-live support"]',
 '["Agencies","Professional Services","Clinics","Local Businesses","Coaches"]',
 '["Website","HubSpot","WhatsApp","Gmail","Google Sheets"]',
 '["Professional Services","Health","Coaching","Retail"]',
 '["Visitor asks a question","AI answers","Visitor qualified","Lead captured","Team notified"]',
 '["ai","chatbot","assistant","website"]',
 '["improve-customer-support","follow-up-leads-instantly"]',
 49900,'5-10 working days',10,true,9),

('email-lead-nurture-automation','Email Lead Nurture Automation','marketing','business',NULL,
 'Leads are nurtured with useful messages until they are ready to buy.',
 'Automatically nurture leads until they are ready to take the next step.',
 'Most leads are not ready to buy today, and without follow-up they forget you exist. This automation keeps you useful and visible until the timing is right.',
 '["Nurture sequence design","Email copy setup","Segmentation rules","Engagement tracking","Exit and suppression rules","Testing","Go-live support"]',
 '["Coaches","Agencies","Consultants","Ecommerce","Professional Services"]',
 '["Mailchimp","ActiveCampaign","HubSpot","Gmail","Outlook","Google Sheets"]',
 '["Marketing","Coaching","Retail","Professional Services"]',
 '["Lead captured","Segmented","Nurture sequence","Engagement scored","Sales alerted"]',
 '["email","nurture","sequence","marketing"]',
 '["automate-sales-follow-up"]',
 29900,'4-6 working days',6,false,10),

('lead-reactivation-automation','Lead Reactivation Automation','sales','business',NULL,
 'Dormant leads already in your database are reawakened into conversations.',
 'Automatically reconnect with dormant leads already sitting inside your CRM or database.',
 'Most businesses are sitting on hundreds of old enquiries that were never closed. This automation restarts those conversations without any manual effort.',
 '["Database review","Segmentation","Reactivation messaging","Multi-channel follow-up","Response routing","Testing","Go-live support"]',
 '["Agencies","Estate Agents","Recruiters","Small Sales Teams","Local Businesses"]',
 '["HubSpot","Zoho","Salesforce","GoHighLevel","WhatsApp","Gmail","Mailchimp"]',
 '["Property","Recruitment","Marketing","Professional Services"]',
 '["Dormant leads identified","Segmented","Reactivation message","Replies routed","Sales follow-up"]',
 '["reactivation","dormant leads","database","cold leads"]',
 '["automate-sales-follow-up","stop-losing-leads"]',
 34900,'4-7 working days',7,false,11),

('sales-marketing-automation-system','Sales & Marketing Automation System','sales','system','Most Popular',
 'Lead generation, CRM, email, WhatsApp, booking and sales follow-up working as one system.',
 'Connect lead generation, CRM, email, WhatsApp, booking and sales follow-up into one automated system.',
 'Individual automations help, but growth comes from a connected system. This brings your capture, CRM, messaging, booking and follow-up together so nothing falls between the gaps.',
 '["Full discovery session","All lead source integrations","CRM build and connection","Email and WhatsApp follow-up","Booking automation","Pipeline automation","Reporting setup","Full testing","Team training","Go-live support","Documentation"]',
 '["Agencies","Professional Services","Small Sales Teams","Consultants","Clinics"]',
 '["HubSpot","Zoho","Salesforce","GoHighLevel","Meta","Google Ads","LinkedIn","WhatsApp","Gmail","Outlook","Mailchimp","Stripe","Calendly","Google Calendar"]',
 '["Marketing","Professional Services","Property","Health"]',
 '["Lead captured","CRM record","Instant follow-up","Nurture sequence","Booking","Pipeline automation","Reporting"]',
 '["system","end to end","full automation","growth"]',
 '["follow-up-leads-instantly","automate-sales-follow-up","connect-my-business-apps","stop-losing-leads"]',
 99900,'10-15 working days',15,true,12);

-- ============ SEED: BUNDLES ============
INSERT INTO public.store_bundles (slug,name,description,best_for,includes,product_slugs,price_pence,saving_pence,badge,delivery_estimate,position) VALUES
('lead-generation-bundle','Lead Generation Bundle','Everything you need to capture every enquiry and respond before your competitors do.','Businesses that generate leads online and want faster follow-up.',
 '["Lead capture","CRM integration","Instant sales notification","Email follow-up","WhatsApp follow-up"]',
 '["instant-lead-follow-up-automation","lead-to-crm-automation","whatsapp-lead-follow-up-system"]',
 89900,19900,'Best Value','7-12 working days',1),
('appointment-business-bundle','Appointment Business Bundle','A complete booking engine for businesses that live and die by the diary.','Clinics, coaches and service businesses that take appointments.',
 '["Lead capture","Booking","Confirmation","Reminders","No-show recovery","Review requests"]',
 '["appointment-booking-automation","no-show-recovery-automation","customer-review-automation"]',
 79900,14900,NULL,'7-12 working days',2),
('small-business-automation-starter-pack','Small Business Automation Starter Pack','The essential automations every growing small business should have running.','Small businesses automating for the first time.',
 '["Lead capture","CRM","Email follow-up","Appointment automation","Review automation"]',
 '["lead-to-crm-automation","email-lead-nurture-automation","appointment-booking-automation","customer-review-automation"]',
 99900,24900,'Popular','10-15 working days',3),
('sales-automation-bundle','Sales Automation Bundle','A full sales engine from first enquiry through to a managed pipeline.','Sales teams that need consistent follow-up at volume.',
 '["Lead capture","CRM","Lead qualification","Sales alerts","Email nurture","WhatsApp follow-up","Pipeline automation"]',
 '["instant-lead-follow-up-automation","lead-to-crm-automation","email-lead-nurture-automation","whatsapp-lead-follow-up-system","lead-reactivation-automation"]',
 129900,34900,NULL,'12-18 working days',4);

-- ============ SEED: MANAGED PLANS ============
INSERT INTO public.store_plans (slug,name,description,price_pence,price_prefix,features,position) VALUES
('automation-care','Automation Care','Keep your automations healthy and working every day.',4900,NULL,
 '["Workflow monitoring","Error checking","Basic troubleshooting","Minor adjustments","Integration support"]',1),
('automation-growth','Automation Growth','Everything in Care, plus continuous improvement.',14900,NULL,
 '["Everything in Automation Care","Optimisation","Monthly workflow review","Minor workflow improvements","Priority support","Performance recommendations"]',2),
('automation-partner','Automation Partner','An automation team working alongside your business.',39900,'From',
 '["Ongoing automation development","Automation strategy","Advanced workflow management","Priority implementation","Optimisation","Reporting","Dedicated support"]',3);