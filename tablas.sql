CREATE TABLE Usuario
(
    CelNumero INT PRIMARY KEY,
    Unombre VARCHAR(255),
    Uapellido VARCHAR(255),
    Uresidencia POINT,
    Uemail VARCHAR(255),
    Urecibo BYTEA,
    UtipoTarjeta VARCHAR(255),
    UnumTarjeta INT
);


CREATE TABLE Trabajador
(
    IDtrabajador VARCHAR(255) PRIMARY KEY,
    Tnombre VARCHAR(255),
    Tapellido VARCHAR(255),
    TnumEstrellas FLOAT,
    TfotoPerfil BYTEA,
    IDimagen int,
    Estado BOOLEAN,
    Direccion POINT
);


CREATE TABLE Servicio
(
    ServicioID INT PRIMARY KEY,
    Descripcion VARCHAR(255)
);


CREATE TABLE Solicitud
(
    IDsolicitud INT PRIMARY KEY,
    CelNumero INT,
    Pago FLOAT,
    Calificacion INT,
    FOREIGN KEY (CelNumero) REFERENCES Usuario(CelNumero)
);


CREATE TABLE ListaPredefinidaLabores
(
    Lista VARCHAR(255) PRIMARY KEY,
    ServicioID INT,
    FOREIGN KEY (ServicioID) REFERENCES Servicio(ServicioID)
);


CREATE TABLE TrabajadoresEnZona
(
    ServicioID INT,
    IDtrabajador VARCHAR(255),
    PRIMARY KEY (ServicioID, IDtrabajador),
    FOREIGN KEY (ServicioID) REFERENCES Servicio(ServicioID),
    FOREIGN KEY (IDtrabajador) REFERENCES Trabajador(IDtrabajador)
);


CREATE TABLE Labor
(
    IDlabor VARCHAR(255) PRIMARY KEY,
    IDtrabajador VARCHAR(255),
    Lnombre VARCHAR(255),
    Precio FLOAT,
    FOREIGN KEY (IDtrabajador) REFERENCES Trabajador(IDtrabajador)
);