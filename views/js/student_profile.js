
function openNav() {
  document.getElementById("mySidebar").style.width = "250px";
  document.getElementById("main").style.marginLeft = "250px";
}

/* Set the width of the sidebar to 0 and the left margin of the page content to 0 */
function closeNav() {
  document.getElementById("mySidebar").style.width = "0";
  document.getElementById("main").style.marginLeft = "0";
}
const prevButton = document.querySelector(".prev");
const nextButton = document.querySelector(".next");
const studentContent = document.querySelector(".student-content");

let currentPage = 1;

prevButton.addEventListener("click", function() {
  if (currentPage > 1) {
    currentPage--;
    studentContent.innerHTML = `<h2>Page ${currentPage}</h2><p>Content for Page ${currentPage}</p>`;
  }
});

nextButton.addEventListener("click", function() {
  if (currentPage < 4) {
    currentPage++;
    studentContent.innerHTML = `<h2>Page ${currentPage}</h2><p>Content for Page ${currentPage}</p>`;
  }
});

  function showFirstPage(){
    document.getElementById('first').style.display='block';
    document.getElementById('second').style.display='none';
    document.getElementById('third').style.display='none';
  }
  function showSecondPage(){
    console.log("Hello");
    document.getElementById('first').style.display='none';
    document.getElementById('second').style.display='block';
    document.getElementById('third').style.display='none';
  }
  function showThirdPage(){
    document.getElementById('first').style.display='none';
    document.getElementById('second').style.display='none';
    document.getElementById('third').style.display='block';
  }


