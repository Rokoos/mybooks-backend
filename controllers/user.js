const fs = require('fs')
const formidable = require('formidable')
const _ = require('lodash')
const User = require('../models/user')

exports.userById = (req, res, next, id) => {
    User.findById(id)
    .exec((err, user) => {
        if(err || !user) {
            return res.status(400).json({
                error: "User not found"
            })
        }

        req.profile = user // adds profile object in req with user info
        next()
    })
}

exports.hasAuthorization = (req, res, next) => {
    const authorized = req.profile && req.auth &&  req.profile._id === req.auth._id 
    
    if(!authorized){
        return res.status(403).json({
            error: 'User is not authorized to perform this action'
        })
    }
}

exports.allUsers = (req, res) => {
    User.find((err, users) => {
        if(err) {
            return res.status(400).json({
                error: err
            })
        }

        const filteredUsers = users.filter(user => user.visible === 1)
        console.log(filteredUsers)
        res.json(filteredUsers)
    })
    .sort({created: -1})
    .select('name email about visible updated created')
}

exports.getUser = (req, res) => {
    req.profile.hashed_password = undefined
    req.profile.salt = undefined
    return res.json(req.profile)
}



exports.updateUser = (req, res, next) => {
    let form = new formidable.IncomingForm()
    form.keepExtensions = true
    form.parse(req, (err, fields, files) =>{
        if(err){
            return res.status(400).json({
                error: "Photo could not be uploaded!"
            })
        }

        let user = req.profile
        user = _.extend(user, fields)
        user.updated = Date.now()

        if(files.photo){
            user.photo.data = fs.readFileSync(files.photo.path)
            user.photo.contentType = files.photo.type
              
        }

        user.save((err, result) => {
            if(err){
                return res.status(400).json({
                    error: err
                })
            }
 
            user.hashed_password = undefined
            user.salt = undefined
            res.json(user)
        })

    })
}

exports.userPhoto = (req, res) => {
    res.set(("Content-Type", req.profile.photo.contentType))
        return res.send(req.profile.photo.data)
}

exports.deleteUser = (req, res, next) => {
    let user = req.profile
    user.visible = 0
    user.save((err, result) => {
        if(err){
            return res.status(400).json({
                error: err
            })
        }

        
        res.json({message: "User deleted successfully."})
    })
}

