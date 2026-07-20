export function DashboardView()
{
    return `

<div class="dashboard-container">


    <aside class="sidebar">


        <div class="sidebar-logo">

            <img src="/assets/logo.png">

            <h2>
                Intellix
            </h2>

        </div>



        <nav class="sidebar-menu">

            <a href="#/dashboard">
                Dashboard
            </a>

            <a href="#/dashboard">
                Patients
            </a>

            <a href="#/dashboard">
                Appointments
            </a>

            <a href="#/dashboard">
                Billing
            </a>

            <a href="#/dashboard">
                Reports
            </a>


        </nav>


        <button class="logout-btn" id="logoutBtn" type="button">

            Logout

        </button>


    </aside>





    <main class="dashboard-main">


        <header class="dashboard-header">


            <div>

                <h1>
                    Dashboard
                </h1>

                <p>
                    Welcome back to hospital management system
                </p>

            </div>



            <div class="user-profile">

                <div id="userInfo" class="user-info"></div>

                <div class="avatar">
                    A
                </div>


                <span>
                    Admin
                </span>


            </div>


        </header>





        <section class="dashboard-cards">


            <div class="dashboard-card">

                <h3>
                    Total Patients
                </h3>

                <div class="number">
                    245
                </div>

            </div>



            <div class="dashboard-card">

                <h3>
                    Today's Appointments
                </h3>

                <div class="number">
                    32
                </div>

            </div>



            <div class="dashboard-card">

                <h3>
                    Doctors
                </h3>

                <div class="number">
                    18
                </div>

            </div>


        </section>


    </main>


</div>

`;
}