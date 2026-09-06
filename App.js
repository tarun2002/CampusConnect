var express = require('express');
const handlebars = require('handlebars');
const { createPool } = require('mysql2');
const cookie = require('cookie-parser');
const PDFDocument = require('pdfkit');
var fs=require('fs');
const sessionStorage = require("node-sessionstorage");
var path = require('path')
const session = require('express-session');
const crypto = require('crypto');
const uuidv4 = require('uuid').v4;
var bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mime = require('mime');
const { render } = require('ejs');
var isAuthenticated;
var user, admin,personal_data,ed_details,projects,internships;
var app = new express();
let project_details,intern_details;
// DB connection

const pool = createPool({
  host: "localhost",
  user: "root",
  password: "12345678",
  database: "campusconnect"
});


const sessions={};
const secret = crypto.randomBytes(32).toString('hex');
app.use(cookieParser());
app.use(session({
  genid: () => {
    return uuidv4(); // Use UUIDv4 as the session ID generator
  },
  secret: secret, 
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));
app.use('/js', function(req, res, next) {
  res.type('text/javascript');
  next();
});

app.use(express.static(path.join(__dirname, 'views/js')));
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'static')));
app.set('view engine', 'ejs');
app.get('/', function (req, res) {
  res.sendFile(__dirname+'/static/home.html')
})
app.get('/student_signup',function (req, res) {
  res.sendFile(__dirname+'/static/student_signup.html')
})
app.get('/admin_signup',function (req, res) {
  res.sendFile(__dirname+'/static/admin_signup.html');
})
app.get('/admin_login',function (req, res) {
  res.render('admin_login', { togglePopup : true, message: '' });
});
app.get('/admin_login',function (req, res) {
  res.render('admin_login', { togglePopup : true, message: '' });
})
app.get('/admin_search',function(req,res){
  res.render('admin_search.ejs');
})
app.get('/student_login',function (req, res) {
  res.render('student_login', { togglePopup : true, message: '' });
})
function profile_data(req,res){
  if(!isAuthenticated){
    res.render('student_login', { togglePopup : true, message: 'You need to login first' });
  }
  else{
     var user = sessionStorage.getItem("user");
    pool.query(`
    SELECT 
      user_credentials.email_id, 
      projects.project, 
      internships.internship, 
      student_personal_details.*, 
      student_ed_details.*
    FROM 
      user_credentials 
      LEFT JOIN projects ON user_credentials.email_id = projects.id
      LEFT JOIN internships ON user_credentials.email_id = internships.id
      LEFT JOIN student_personal_details ON user_credentials.email_id = student_personal_details.id
      LEFT JOIN student_ed_details ON user_credentials.email_id = student_ed_details.id
    WHERE 
      user_credentials.username = ?
  `, [user.username], function(err, result) {
    if (err) {
      console.log(err);
    } else {
      if (result.length > 0) {
        console.log(user);
        const user_det = result[0];
        project_details = JSON.parse(user_det.project || null);
        intern_details = JSON.parse(user_det.internship || null);
        personal_data = result[0];
        ed_details = result[0];
        res.render('student_profile', {user_d:user.username,personal_data:personal_data,ed_details:ed_details,intern:intern_details,projects:project_details});
      }
    }
  });
}
}
app.get('/student_profile',profile_data);

app.get('/admin_profile',function (req, res) {
  if(!isAuthenticated){
    res.render('admin_login', { togglePopup : true, message: 'You need to login first' });
  } else {
     var admin = sessionStorage.getItem("admin");
    pool.query(
      `
    SELECT 
      admin_credentials.email_id, 
      admin_projects.projects, 
      admin_experience.experience, 
      admin_personal_details.*, 
      admin_ed_details.*
    FROM 
      admin_credentials 
      LEFT JOIN admin_projects ON admin_credentials.email_id = admin_projects.id
      LEFT JOIN admin_experience ON admin_credentials.email_id = admin_experience.id
      LEFT JOIN admin_personal_details ON admin_credentials.email_id = admin_personal_details.id
      LEFT JOIN admin_ed_details ON admin_credentials.email_id = admin_ed_details.id
    WHERE 
      admin_credentials.username = ?
  `,
      [admin.username],
      function (err, result) {
        if (err) {
          console.log(err);
        } else {
          if (result.length > 0) {
            console.log(admin,result);
            const admin_det = result[0];
            project_details = JSON.parse(admin_det.projects || null);
            exp_details = JSON.parse(admin_det.experience || null);
            personal_data = result[0];
            ed_details = result[0];
            res.render("admin_profile", {
              admin_d: admin.username,
              admin_personal_data: personal_data,
              admin_ed_details: ed_details,
              experience: exp_details,
              admin_projects: project_details,
            });
          }
        }
      }
    );
  }
})


// registration DB changes
app.post('/student_signup',function(req,res,next){
   var username=req.body.student_username;
    var email=req.body.student_email;
    var pwd=req.body.student_password;
    pool.query(`insert into user_credentials (email_id,username
    ,password)values (?,?,?)`,[email,username,pwd],function(err,result){
      if(err){
        return console.log(err);
      }
      return res.redirect('/student_login');
    })
});

app.post('/admin_signup',function(req,res,next){
   var username=req.body.admin_username;
    var email=req.body.admin_email;
    var pwd=req.body.admin_password;
    pool.query(`insert into admin_credentials (email_id,username
    ,password)values (?,?,?)`,[email,username,pwd],function(err,result){
      if(err){
        return console.log(err);
      }
      return res.redirect('/admin_login');
    })
});
app.get('/logout',function(req,res){
  isAuthenticated=false;
  res.redirect('/');
});

app.post('/student_login',function(req,res,next){
   
  var email = req.body.email;
  var username = req.body.email;
  var password = req.body.pass;
 pool.query(
   `SELECT * FROM user_credentials WHERE (email_id = ? OR username = ?) AND password = ?`,
   [email, username, password],
   function (err, result, fields) {
     if (err) {
       return console.log(err);
     } else if (result.length > 0) {
       //  const sessionId = uuidv4();
       //   sessions[sessionId]={email,userId:1}
       //   console.log(sessionId);
       user = result[0];
       sessionStorage.setItem("user", user);
       isAuthenticated = true;
       res.redirect("/student_profile");
     } else {
       res.render("student_login", {
         togglePopup: true,
         message: "Invalid username or password",
       });
       return;
     }
   }
 );
});

app.post('/admin_login',function(req,res,next){
  isAuthenticated=false;
  var email = req.body.admin_user;
  var password = req.body.admin_password;
  pool.query(`select * from admin_credentials where (email_id=(?) or username=(?)) and password=(?)`,[email,email,password],function(err,result,fields){
    if (err) {
        return console.log(err);
    }
    else if(result.length > 0){
      const sessionId = uuidv4();
      sessions[sessionId]={email,userId:1}
      console.log(sessionId);
       admin = result[0];
       sessionStorage.setItem("admin", admin);
       console.log(admin);
       isAuthenticated=true;
      res.redirect('/admin_page');
  }
    else{
       res.render('admin_login', { togglePopup : true, message: 'Invalid username or password' });
      return;
    }
})
});
// function userFunc(){
//   console.log('user',user);
// }
// setInterval(userFunc, 10000 );
app.get('/admin_page',function(req,res){
  res.render('admin_page');
})
app.post('/saveDetails',(req,res)=>{
  //console.log(req.body);
   var firstname = req.body.fname;
  var lastname = req.body.lname;
  var dob=req.body.dob;
  var gender = req.body.gender;
  var aadhaar = req.body.aadhaar;
  var father_name = req.body.father_name;
  var mother_name = req.body.mother_name;
  var parent_phone = req.body.parent_phone;
  var email = req.body.email;
  var phone = req.body.phone;
  var address = req.body.address;

  var reg_no = req.body.reg_no;
    var uni_name = req.body.uni_name;
    var univ_course = req.body.univ_course;
    var ug_board = req.body.ug_board;
    var univ_start_year = req.body.univ_start_year;
    var univ_end_year = req.body.univ_end_year;
    var univ_cgpa = req.body.univ_cgpa;
    
    var clg_name = req.body.clg_name;
    var clg_course = req.body.clg_course;
    var clg_board = req.body.clg_board;
    var clg_start_year = req.body.clg_start_year;
    var clg_end_year = req.body.clg_end_year;
    var clg_cgpa = req.body.clg_cgpa;
    
    var scl_name = req.body.scl_name;
    var yop = req.body.yop;
    var scl_cgpa = req.body.scl_cgpa;
    var scl_board = req.body.scl_board;

    var skills = req.body.skills;
    var certificates = req.body.certificates;
    var projects = [];
    var project_titles=[];
    var project_des=[];
    if(typeof req.body.title ==='string'){
      project_titles.push([req.body.title]);
    }
    else{
    project_titles.push(req.body.title);
    }
    if (typeof req.body.description === "string") {
      project_des.push([req.body.description]);
    } else {
      project_des.push(req.body.description);
    }
    for (var i = 0; project_titles!=[]&& i < project_titles[0].length; i++) {
      var project = {
        title: project_titles[0][i],
        description: project_des[0][i]
      };
      projects.push(project);
  }
   var internships = [];
   var job_titles=[];
   var job=[];
   if(typeof req.body.company=== 'string'){
     job_titles.push([req.body.company]);
   }
   else{
    job_titles.push(req.body.company);
    
   }
   if (typeof req.body.company === "string") {
     job.push([req.body.jobDesc]);
   } else {
     job.push(req.body.jobDesc);
   }
    console.log(job_titles);
    for (var i = 0;job_titles!=[] && i < job_titles[0].length; i++) {
      var intern = {
        company: job_titles[0][i],
        jobDesc: job[0][i]
      };
      internships.push(intern);
  }
  pool.query(`select * from student_personal_details where id=?`,[user.email_id],function(err,result,fields){
    if (err) {
        return console.log(err);
    }
    else if(result.length == 0){
      //console.log("result",result);
       pool.query(`insert into student_personal_details (id,firstname,lastname,dob,gender,aadhaar,father,mother,parent_phone,email,phone,address)values (?,?,?,?,?,?,?,?,?,?,?,?)`,[user.email_id, firstname,lastname,dob,gender,aadhaar,father_name,mother_name,parent_phone,email,phone,address],function(err,result){
      if(err){
        return console.log(err);
      }
    });
     pool.query(`insert into student_ed_details (id,reg_no,uni_name,univ_course,ug_board,univ_start_year,univ_end_year,univ_cgpa,clg_name,clg_course,clg_board,clg_start_year,clg_end_year,clg_cgpa,scl_name,yop,scl_cgpa,scl_board,skills,certi)values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[user.email_id,reg_no,uni_name,univ_course,ug_board,univ_start_year,univ_end_year,univ_cgpa,clg_name,clg_course,clg_board,clg_start_year,clg_end_year,clg_cgpa,scl_name,yop,scl_cgpa,scl_board,skills,certificates],function(err,result){
      if(err){
        return console.log(err);
      }
    }); 
    // insert projects
    pool.query(`insert into projects (id, project)`,[user.email_id,JSON.stringify(projects)],function(err,result){
      if(err){
        return console.log(err);
      }
    }); 
    //insert internships
     pool.query(`insert into internships (id, internship)`,[user.email_id,JSON.stringify(internships)],function(err,result){
      if(err){
        return console.log(err);
      }
    }); 


  }
    else{
      pool.query(`UPDATE student_personal_details SET firstname=?, lastname=?, dob=?, gender=?, aadhaar=?, father=?, mother=?, parent_phone=?, email=?, phone=?, address=? WHERE id=?`,[firstname,lastname,dob,gender,aadhaar,father_name,mother_name,parent_phone,email,phone,address,user.email_id],function(err,result){
      if(err){
        return console.log(err);
      }
    });
      
    pool.query(`UPDATE student_ed_details SET reg_no=?, uni_name=?, univ_course=?, ug_board=?, univ_start_year=?, univ_end_year=?, univ_cgpa=?, clg_name=?, clg_course=?, clg_board=?, clg_start_year=?, clg_end_year=?, clg_cgpa=?, scl_name=?, yop=?, scl_cgpa=?, scl_board=?, skills=?, certi=? WHERE id=?`,[reg_no,uni_name,univ_course,ug_board,univ_start_year,univ_end_year,univ_cgpa,clg_name,clg_course,clg_board,clg_start_year,clg_end_year,clg_cgpa,scl_name,yop,scl_cgpa,scl_board,skills,certificates,user.email_id],function(err,result){
      if(err){
        return console.log(err);
      }
    })

     pool.query(`UPDATE projects SET project=? where id=?`,[JSON.stringify(projects),user.email_id],function(err,result){
      if(err){
        return console.log(err);
      }
    }); 

     pool.query(`UPDATE internships SET internship=? where id=?`,[JSON.stringify(internships),user.email_id],function(err,result){
      if(err){
        return console.log(err);
      }
    }); 
      
    }
})
    setTimeout(() => {
      res.redirect("/student_profile");
    }, 1000);
});
 
app.post('/saveAdminDetails',function(req,res){
   var firstname = req.body.fname;
   var lastname = req.body.lname;
   var dob = req.body.dob;
   var gender = req.body.gender;
   var email = req.body.email;
   var phone = req.body.phone;
   var address = req.body.address;

   var uni_name = req.body.uni_name;
   var univ_course = req.body.univ_course;
   var ug_board = req.body.ug_board;
   var univ_start_year = req.body.univ_start_year;
   var univ_end_year = req.body.univ_end_year;
   var univ_cgpa = req.body.univ_cgpa;

   var clg_name = req.body.clg_name;
   var clg_course = req.body.clg_course;
   var clg_board = req.body.clg_board;
   var clg_start_year = req.body.clg_start_year;
   var clg_end_year = req.body.clg_end_year;
   var clg_cgpa = req.body.clg_cgpa;

   var scl_name = req.body.scl_name;
   var yop = req.body.yop;
   var scl_cgpa = req.body.scl_cgpa;
   var scl_board = req.body.scl_board;

   var skills = req.body.skills;
   var certificates = req.body.certificates;
 var projects = [];
 var project_titles = [];
 var project_des = [];
 if (typeof req.body.title === "string") {
   project_titles.push([req.body.title]);
 } else if (Array.isArray(req.body.title)) {
   project_titles.push(req.body.title);
 }
 if (typeof req.body.description === "string") {
   project_des.push([req.body.description]);
 } else if (Array.isArray(req.body.description)) {
   project_des.push(req.body.description);
 }
console.log("project_titles", project_titles);
console.log("project_des", project_des);
   if (project_titles[0].length > 0 || project_des[0].length > 0) {
    for(var i =0; i < project_titles[0].length;i++){
     var project = {
       title: project_titles[0][i] || "",
       description: project_des[0][i] || "",
     };
     console.log("project",project,i);
     projects.push(project);
    }
  }
   

var experience = [];
var job_titles = [];
var job = [];
if (typeof req.body.organization === "string") {
  job_titles.push([req.body.organization]);
} else if (Array.isArray(req.body.organization)) {
  job_titles.push(req.body.organization);
}
if (typeof req.body.jobDesc === "string") {
  job.push([req.body.jobDesc]);
} else if (Array.isArray(req.body.jobDesc)) {
  job.push(req.body.jobDesc);
}
console.log("job_titles",job_titles);
console.log("job", job);
 if (job_titles[0].length > 0 || job[0].length > 0) {
  for (var i = 0; i < job_titles[0].length && i < job[0].length; i++) {
   var exp = {
     organization: job_titles[0][i] || "",
     jobDesc: job[0][i] || "",
   };
   experience.push(exp);
 }
}
console.log("projects: ",projects);
console.log("Experience",experience);
    pool.query(`select * from admin_personal_details where id=?`,[admin.email_id],function(err,result,fields){
    if (err) {
        return console.log(err);
    }
    else if(result.length == 0){
      //console.log("result",result);
       pool.query(`insert into admin_personal_details (id,firstname,lastname,dob,gender,email,phone,address)values (?,?,?,?,?,?,?,?)`,[admin.email_id, firstname,lastname,dob,gender,email,phone,address],function(err,result){
      if(err){
        return console.log(err);
      }
    });
     pool.query(`insert into admin_ed_details (id,uni_name,univ_course,ug_board,univ_start_year,univ_end_year,univ_cgpa,clg_name,clg_course,clg_board,clg_start_year,clg_end_year,clg_cgpa,scl_name,yop,scl_cgpa,scl_board,skills,certi)values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[admin.email_id,uni_name,univ_course,ug_board,univ_start_year,univ_end_year,univ_cgpa,clg_name,clg_course,clg_board,clg_start_year,clg_end_year,clg_cgpa,scl_name,yop,scl_cgpa,scl_board,skills,certificates],function(err,result){
      if(err){
        return console.log(err);
      }
    }); 
    // insert projects
    pool.query(`insert into admin_projects (id, projects) values (?,?)`,[admin.email_id,JSON.stringify(projects)],function(err,result){
      if(err){
        return console.log(err);
      }
    }); 
    //insert internships
     pool.query(`insert into admin_experience (id, experience) values (?,?)`,
       [admin.email_id, JSON.stringify(experience)],
       function (err, result) {
         if (err) {
           return console.log(err);
         }
       }
     ); 


  }
    else{
      pool.query(`UPDATE admin_personal_details SET firstname=?, lastname=?, dob=?, gender=?, email=?, phone=?, address=? WHERE id=?`,[firstname,lastname,dob,gender,email,phone,address,admin.email_id],function(err,result){
      if(err){
        return console.log(err);
      }
    });
      
    pool.query(`UPDATE admin_ed_details SET uni_name=?, univ_course=?, ug_board=?, univ_start_year=?, univ_end_year=?, univ_cgpa=?, clg_name=?, clg_course=?, clg_board=?, clg_start_year=?, clg_end_year=?, clg_cgpa=?, scl_name=?, yop=?, scl_cgpa=?, scl_board=?, skills=?, certi=? WHERE id=?`,[uni_name,univ_course,ug_board,univ_start_year,univ_end_year,univ_cgpa,clg_name,clg_course,clg_board,clg_start_year,clg_end_year,clg_cgpa,scl_name,yop,scl_cgpa,scl_board,skills,certificates,admin.email_id],function(err,result){
      if(err){
        return console.log(err);
      }
    })

     pool.query(`UPDATE admin_projects SET projects=? where id=?`,[JSON.stringify(projects),admin.email_id],function(err,result){
      if(err){
        return console.log(err);
      }
    }); 

     pool.query(
       `UPDATE admin_experience SET experience=? where id=?`,
       [JSON.stringify(experience), admin.email_id],
       function (err, result) {
         if (err) {
           return console.log(err);
         }
       }
     ); 
      
    }
})
    setTimeout(() => {
      res.redirect("/admin_profile");
    }, 1000);
});

  
app.get('/search',function(req,res){
   if(!isAuthenticated){
    res.render('admin_login', { togglePopup : true, message: 'You need to login first' });
  }
    var search_item = req.query.q;
   pool.query(`
    SELECT 
      user_credentials.email_id, 
      projects.project, 
      internships.internship, 
      student_personal_details.*, 
      student_ed_details.*
    FROM 
      user_credentials 
      LEFT JOIN projects ON user_credentials.email_id = projects.id
      LEFT JOIN internships ON user_credentials.email_id = internships.id
      LEFT JOIN student_personal_details ON user_credentials.email_id = student_personal_details.id
      LEFT JOIN student_ed_details ON user_credentials.email_id = student_ed_details.id
    WHERE 
      user_credentials.username = ?
  `, [search_item], function(err, result) {
    if (err) {
      console.log(err);
    } else {
      if (result.length > 0) {
        user = result[0];
        project_details = JSON.parse(user.project || null);
        intern_details = JSON.parse(user.internship || null);
        personal_data = result[0];
        ed_details = result[0];
        res.render('admin_view', {personal_data:personal_data,ed_details:ed_details,intern:intern_details,projects:project_details});
      }
    }
  });
});
   
function generatePDF(req, res) {
  // const doc = new PDFDocument();

  // // set some response headers
  // res.setHeader('Content-Type', 'application/pdf');
  // res.setHeader('Content-Disposition', 'attachment; filename=example.pdf');

  // // pipe the PDF document to the response object
  // doc.pipe(res);

  // // add some content to the PDF
  // doc.fontSize(18).text('Example PDF', { align: 'center' });
  // doc.fontSize(12).text('Hello, World!', { align: 'center' });

  // // finalize the PDF and close the file stream
  // doc.end();
  // create a new PDF document
  const doc = new PDFDocument();
  doc.lineGap(-2);
  //add some content to the PDF
  doc.fontSize(30).text(`${personal_data.firstname} ${personal_data.lastname}`, { align: 'center' });
  doc.fontSize(12).text(`Email: ${personal_data.email}`, { align: 'center' });
  doc.fontSize(12).text(`Phone: ${personal_data.phone}`, { align: 'center' });
  doc.moveDown();

  // add education details
  doc.fontSize(16).text('Education', { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Degree: ${ed_details.univ_course}`);
  doc.fontSize(12).text(`Institution: ${ed_details.uni_name}`);
  doc.fontSize(12).text(`CGPA: ${ed_details.univ_cgpa}`);
  doc.moveDown();
   doc.fontSize(12).text(`Intermediate: ${ed_details.univ_course}`);
  doc.fontSize(12).text(`Institution: ${ed_details.clg_name}`);
  doc.fontSize(12).text(`CGPA: ${ed_details.clg_cgpa}`);
  doc.fontSize(12).text(`SSC: `);
  doc.fontSize(12).text(`Institution: ${ed_details.scl_name}`);
  doc.fontSize(12).text(`CGPA: ${ed_details.scl_cgpa}`);
  doc.moveDown();

  // add project details
  if (project_details) {
    doc.fontSize(16).text('Projects', { underline: true });
    doc.moveDown();
    project_details.forEach((project, index) => {
      doc.fontSize(12).text(`Project ${index+1}: ${project.title}`);
      doc.fontSize(10).text(`Description: ${project.description}`);
      // doc.fontSize(10).text(`Technologies: ${project.technologies}`);
      doc.moveDown();
    });
  }

  // add internship details
  if (intern_details) {
    doc.fontSize(16).text('Experience', { underline: true });
    doc.moveDown();
    intern_details.forEach((internship, index) => {
      doc.fontSize(12).text(`Internship ${index+1}: ${internship.company}`);
      doc.fontSize(10).text(`Description: ${internship.jobDesc}`);
      doc.moveDown();
    });
  }

   var skill_list,certi_list;
  var skills_sep = ed_details.skills;
  var certi_sep=ed_details.certi;
  if(skills_sep!=null || skills_sep!=''){
      skill_list=skills_sep.split(",");
  }
  if(certi_sep!=null || certi_sep!=''){
      certi_list=certi_sep.split(",");
  }
   doc.fontSize(16).text('Skills', { underline: true });
  doc.moveDown();
  skill_list.forEach((skill, index) => {
      doc.fontSize(10).text(`${skill.trim()}`);
      doc.moveDown();
    });
     doc.fontSize(16).text('Certificates', { underline: true });
  doc.moveDown();
  certi_list.forEach((certi, index) => {
      doc.fontSize(10).text(`${certi.trim()}`);
      doc.moveDown();
    });
  
  // finalize the PDF and close the file stream
  doc.end();

  const filename = `${personal_data.firstname}_${personal_data.lastname}.pdf`;

  // read the file from disk and pipe it to the response object
  //const fileStream = fs.createReadStream(filename);

  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'application/pdf');

  // pipe the file to the response object
 // fileStream.pipe(res);
 doc.pipe(res);
  return filename;
};

// function generatePDF(req,res){
//   // create a new PDF document

//   const doc = new PDFDocument();

//   // set the PDF document properties
//   doc.info['Title'] = `${personal_data.firstname} ${personal_data.lastname} Resume`;
//   doc.info['Author'] = personal_data.firstname;
//   doc.info['Subject'] = 'Resume';
//   doc.info['Keywords'] = 'resume, job, skills';

//   // set the font styles
//   doc.font('Helvetica');

//   // add the header with name, email, and phone number
//   doc.fontSize(30).fillColor('#444444').text(`${personal_data.firstname} ${personal_data.lastname}`, { align: 'center' });
//   doc.fontSize(12).fillColor('#888888').text(`Email: ${personal_data.email}`, { align: 'center' });
//   doc.fontSize(12).fillColor('#888888').text(`Phone: ${personal_data.phone}`, { align: 'center' });
//   doc.moveDown();

//   // add education details
//   doc.fontSize(16).fillColor('#444444').text('Education', { underline: true });
//   doc.moveDown();
//   doc.fontSize(12).fillColor('#888888').text(`Degree: ${ed_details.univ_course}`);
//   doc.fontSize(12).fillColor('#888888').text(`Institution: ${ed_details.uni_name}`);
//   doc.fontSize(12).fillColor('#888888').text(`CGPA: ${ed_details.univ_cgpa}`);
//   doc.moveDown();
//   doc.fontSize(12).fillColor('#888888').text(`Intermediate: ${ed_details.univ_course}`);
//   doc.fontSize(12).fillColor('#888888').text(`Institution: ${ed_details.clg_name}`);
//   doc.fontSize(12).fillColor('#888888').text(`CGPA: ${ed_details.clg_cgpa}`);
//   doc.fontSize(12).fillColor('#888888').text(`SSC: `);
//   doc.fontSize(12).fillColor('#888888').text(`Institution: ${ed_details.scl_name}`);
//   doc.fontSize(12).fillColor('#888888').text(`CGPA: ${ed_details.scl_cgpa}`);
//   doc.moveDown();

//   // add project details
//   if (project_details) {
//     doc.fontSize(16).fillColor('#444444').text('Projects', { underline: true });
//     doc.moveDown();
//     project_details.forEach((project, index) => {
//       doc.fontSize(12).fillColor('#888888').text(`Project ${index+1}: ${project.title}`);
//       doc.fontSize(10).fillColor('#888888').text(`Description: ${project.description}`);
//       doc.moveDown();
//     });
//   }

//   // add internship details
//   if (intern_details) {
//     doc.fontSize(16).fillColor('#444444').text('Experience', { underline: true });
//     doc.moveDown();
//     intern_details.forEach((internship, index) => {
//       doc.fontSize(12).fillColor('#888888').text(`Internship ${index+1}: ${internship.title}`);
//       doc.fontSize(10).fillColor('#888888').text(`Description: ${internship.description}`);
//       doc.moveDown();
//     });
//   }

//   // add skills and certifications
//   doc.fontSize(16).fillColor('#444444').text('Skills', { underline: true });
//   doc.moveDown();
//   var skill_list,certi_list;
//   var skills_sep = ed_details.skills;
//   var certi_sep=ed_details.certi;
//   // if(skills_sep!=null || skills_sep!=''){
//   //     skill_list
// const filename = `${personal_data.firstname}_${personal_data.lastname}.pdf`;
//  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
// res.setHeader('Content-Type', 'application/pdf');
// doc.pipe(res);
// //   return filename;
// return filename;
// }

app.get('/generatePDF',generatePDF);

app.listen(3000);
